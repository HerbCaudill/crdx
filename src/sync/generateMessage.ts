import { SyncMessage, SyncState } from './types'
import {
  Action,
  getEncryptedLinks,
  getHashes,
  getLinkMap,
  getPredecessorHashes,
  headsAreEqual,
  HashGraph,
} from '/chain'
import { Hash } from '/util'

/**
 * Generates a new sync message for a peer based on our current chain and our sync state with them.
 *
 * @returns A tuple `[state, message]` containing our updated sync state with this peer, and the
 * message to send them. If the message returned is `undefined`, we are already synced up, they know
 * we're synced up, and we don't have any further information to send.  */
export const generateMessage = <A extends Action, C>(
  /** Our current chain */
  chain: HashGraph<A, C>,
  /** Our sync state with this peer */
  prevState: SyncState
): [SyncState, SyncMessage<A, C> | undefined] => {
  const message: SyncMessage<A, C> = {
    root: chain.root,
    head: chain.head,
  }

  const { their, our, lastCommonHead } = prevState
  const state = { ...prevState }

  const ourHead = chain.head
  const theirHead = their.head

  // CASE 0: There's a problem

  // CASE 0A: Their last message caused an error; let them know
  if (our.reportedError) {
    message.error = our.reportedError
    delete our.reportedError
    return [state, message]
  }

  // CASE 0B: They tell us that we caused an error; stop trying to sync
  else if (their.reportedError) {
    return [state, undefined]
  }

  // CASE 1: We synced up in the last round, and they know we synced up, so we're done
  const syncedLastTime = headsAreEqual(ourHead, lastCommonHead)
  if (syncedLastTime) {
    return [state, undefined]
  }

  // CASE 2: We just synced up, but they might not know that; we'll send one last message just to confirm
  const syncedThisTime = headsAreEqual(ourHead, theirHead)
  if (syncedThisTime) {
    // record the fact that we've converged in our sync state
    state.lastCommonHead = ourHead
    return [state, message]
  }

  // construct a map of everything we think they have
  const theirHashLookup = [
    // we know that they have their heads, and any of their predecessors
    ...theirHead,
    ...theirHead.flatMap(h => getPredecessorHashes(chain, h)),

    // their previous heads, and any of their predecessors
    ...lastCommonHead,
    ...lastCommonHead.flatMap(h => getPredecessorHashes(chain, h)),

    // anything in their link map
    ...Object.keys(their.linkMap ?? {}),

    // anything we've already sent
    ...our.links,
  ].reduce((result, h) => ({ ...result, [h]: true }), {})

  let hashesWeThinkTheyNeed = [] as Hash[]

  const weAreAhead =
    theirHead.length && // if we don't know their head, we can't assume we're ahead
    theirHead.every(h => h in chain.links) // we're ahead if we already have all their heads

  if (weAreAhead) {
    // CASE 3: we are ahead of them, so we don't need anything, AND we know exactly what they need

    // Send them everything we have that they don't have
    hashesWeThinkTheyNeed = getHashes(chain).filter(hash => !(hash in theirHashLookup))
  } else {
    // CASE 4: we're either behind, or have diverged

    // if they've sent us a link map,
    if (their.linkMap) {
      // ask for anything they mention that we don't have
      const linksWeHave = { ...chain.links, ...their.links }
      message.need = Object.keys(theirHashLookup).filter(hash => !(hash in linksWeHave))

      // and figure out what links they might need
      hashesWeThinkTheyNeed = getHashes(chain).filter(hash => !(hash in theirHashLookup))
    }

    // If our head has changed since last time we sent them a linkMap,
    if (!headsAreEqual(ourHead, our.linkMapAtHead)) {
      // send a new linkMap with everything that's happened since then
      message.linkMap = getLinkMap({ chain, end: lastCommonHead })
      state.our.linkMapAtHead = ourHead
    }
  }

  // Send them links they need
  const hashesTheyAskedFor = their.need
  const hashesToSend = hashesTheyAskedFor.concat(hashesWeThinkTheyNeed) //

  if (hashesToSend.length) {
    // look up the encrypted links
    message.links = getEncryptedLinks(chain, hashesToSend)
    // add dependency info for links we send
    const additionalDependencies = getLinkMap({ chain, hashes: hashesToSend })
    message.linkMap = { ...message.linkMap, ...additionalDependencies }
  }

  // update our state
  state.our.head = ourHead

  // record what we've sent them
  state.our.links = our.links.concat(hashesToSend)

  // We've sent them everything they've asked for, so reset their need
  state.their.need = []

  return [state, message]
}
