import { getLinkMap } from '../chain/linkMap'
import { SyncMessage, SyncState } from './types'
import { Action, getEncryptedLink, getHashes, getPredecessorHashes, headsAreEqual, SignatureChain } from '/chain'
import { Hash } from '/util'

/**
 * Generates a new sync message for a peer based on our current chain and our sync state with them.
 *
 * @returns A tuple `[state, message]` containing our updated sync state with this peer, and the
 * message to send them. If the message returned is `undefined`, we are already synced up, they know
 * we're synced up, and we don't have any further information to send.  */
export const generateMessage = <A extends Action, C>(
  /** Our current chain */
  chain: SignatureChain<A, C>,
  /** Our sync state with this peer */
  state: SyncState
): [SyncState, SyncMessage<A, C> | undefined] => {
  let { lastCommonHead, their, lastError } = state
  const { root, head: ourHead } = chain
  const ourHashes = getHashes(chain).concat(Object.keys(their.links))
  const message: SyncMessage<A, C> = { root, head: ourHead }

  // CASE 0: Their last message caused a sync error
  if (lastError) {
    delete state.lastError
    const errorMessage = { ...message, error: lastError }
    return [state, errorMessage]
  }

  // TODO: simulate these error conditions in tests

  // TODO: If _our_ last message caused a sync error, we should stop syncing

  // CASE 1: We synced up in the last round, and they know we synced up, so we have nothing more to say
  const syncedLastTime = headsAreEqual(ourHead, lastCommonHead)
  if (syncedLastTime) {
    return [state, undefined]
  }

  // CASE 2: We just synced up, but they might not know that; we'll send one last message just to confirm
  const syncedThisTime = headsAreEqual(ourHead, their.head)
  if (syncedThisTime) {
    // CASE 1b: We are now synced up, but they might not know that; we'll send one last message just to confirm

    // record the fact that we've converged in our sync state
    state.lastCommonHead = ourHead
    return [state, message]
  }

  let hashesWeKnowTheyNeed = [] as Hash[]

  const weAreAhead =
    their.head.length > 0 && // if we don't know their head, we can't assume we're ahead
    their.head.every(h => h in chain.links) // we're ahead if we already have all their heads

  if (weAreAhead) {
    // CASE 3: we are ahead of them, so we don't need anything, AND we know exactly what they need

    // We know they have their heads and everything preceding them
    const hashesTheyHave = [...their.head, ...their.head.flatMap(h => getPredecessorHashes(chain, h))]
    // Send them everything else
    hashesWeKnowTheyNeed = ourHashes.filter(hash => !hashesTheyHave.includes(hash))
  } else {
    // CASE 4: we're either behind, or have diverged

    if (their.linkMap) {
      // if they've sent us a link map, ask for anything we don't have
      message.need = Object.keys(their.linkMap).filter(hash => !(hash in chain.links || hash in state.their.links))
      // and send them any links we know they need
      hashesWeKnowTheyNeed = getHashes(chain).filter(hash => !(hash in their.linkMap!))
    }
    // If we've synced before, send them a map of everything new since the last time
    if (lastCommonHead) {
      // but only if we have something new to send
      if (!headsAreEqual(ourHead, state.weSent.linkMapAtHead))
        message.linkMap = getLinkMap({ chain, end: lastCommonHead })
    }
  }

  // Send them links they need
  const hashesTheyAskedFor = their.need
  const hashesTheyNeed = hashesTheyAskedFor
    .concat(hashesWeKnowTheyNeed)
    .filter(hash => !state.weSent.links.includes(hash)) // exclude links we've already sent

  if (hashesTheyNeed.length) {
    message.links = hashesTheyNeed.reduce(
      (result, hash) => ({
        ...result,
        [hash]: getEncryptedLink(chain, hash),
      }),
      {}
    )

    // add dependency info for links we send
    message.linkMap = {
      ...message.linkMap,
      ...hashesTheyNeed.reduce(
        (result, hash) => ({
          ...result,
          [hash]: chain.links[hash].body.prev,
        }),
        {}
      ),
    }

    state.weSent.links = state.weSent.links.concat(hashesTheyNeed)
  }

  if (message.linkMap) state.weSent.linkMapAtHead = ourHead

  // We've sent them everything they've asked for, so reset their need
  state.their.need = []

  return [state, message]
}
