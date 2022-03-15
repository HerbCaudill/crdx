import { SyncMessage, SyncState } from './types'
import { Action, getEncryptedLink, getHashes, getPredecessorHashes, headsAreEqual, SignatureChain } from '/chain'
import { getLinkMap, isComplete } from '../chain/linkMap'
import { Hash } from '/util'

const depth = 100

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
  let { lastCommonHead, their, theyNeed, lastError } = state
  const { root, head: ourHead } = chain
  const ourHashes = getHashes(chain).concat(Object.keys(their.links))
  const message: SyncMessage<A, C> = { our: { root, head: ourHead }, weNeed: {} }

  // CASE 0: Their last message caused a sync error
  if (lastError) {
    delete state.lastError
    const errorMessage = { ...message, error: lastError }
    return [state, errorMessage]
  }

  // TODO: simulate these error conditions in tests

  // TODO: If _our_ last message caused a sync message, we should stop syncing

  if (state.theyNeed.moreLinkMap) {
    // send our recent hashes
    message.our.linkMap = getLinkMap({ chain, depth, prev: state.our.linkMap, end: lastCommonHead })
  }

  // CASE 1: We are synced up

  const syncedLastTime = headsAreEqual(ourHead, lastCommonHead)
  if (syncedLastTime) {
    // CASE 1a: We synced up in the last round, and they know we synced up, so we have nothing more to say
    return [state, undefined]
  }

  const syncedThisTime = headsAreEqual(ourHead, their.head)
  if (syncedThisTime) {
    // CASE 1b: We are now synced up, but they might not know that; we'll send one last message just to confirm

    // record the fact that we've converged in our sync state
    state.lastCommonHead = ourHead
    return [state, message]
  }

  // CASE 2: We are not synced up

  let hashesWeKnowTheyNeed = [] as Hash[]
  const weAreAhead =
    their.head.length > 0 && // if we don't know their head, we can't assume we're ahead
    their.head.every(h => h in chain.links) // we're ahead if we already have all their heads

  if (weAreAhead) {
    // CASE 2a: we are ahead of them, so we don't need anything, AND we know exactly what they need

    // We know they have their heads and everything preceding them
    const hashesTheyHave = [...their.head, ...their.head.flatMap(h => getPredecessorHashes(chain, h))]
    // Send them everything else
    hashesWeKnowTheyNeed = ourHashes.filter(hash => !hashesTheyHave.includes(hash))
  } else {
    // CASE 2b: they have links we don't have; we could be behind, or we could have diverged

    if (their.linkMap) {
      // if they've mentioned links that we don't have, ask for them
      message.weNeed.links = Object.keys(their.linkMap).filter(
        hash => !(hash in chain.links || hash in state.their.links)
      )

      // if those links still won't give us the whole picture, ask for the next set of recent hashes
      const mergedChainMap = {
        ...getLinkMap({ chain }), // everything we know about
        ...their.linkMap, // their most recent links & dependencies
      }
      message.weNeed.moreLinkMap = !isComplete(mergedChainMap)
      if (!isComplete(mergedChainMap)) {
      } else {
        hashesWeKnowTheyNeed = getHashes(chain).filter(hash => !(hash in their.linkMap!))
      }
    }
  }

  // Send them links they need
  const hashesTheyAskedFor = theyNeed.links
  const hashesTheyNeed = hashesTheyAskedFor.concat(hashesWeKnowTheyNeed)
  message.our.links = hashesTheyNeed.reduce(
    (result, hash) => ({
      ...result,
      [hash]: getEncryptedLink(chain, hash),
    }),
    {}
  )

  // include dependency map info for links we send
  message.our.linkMap = {
    ...message.our.linkMap,
    ...hashesTheyNeed.reduce((result, hash) => ({ ...result, [hash]: chain.links[hash].body.prev }), {}),
  }

  // Remember what we've sent
  state.our.linkMap = message.our.linkMap

  // We've sent them everything they've asked for, so reset their need
  state.theyNeed.links = []

  return [state, message]
}
