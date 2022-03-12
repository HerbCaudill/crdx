import { SyncMessage, SyncState } from './types'
import { Action, getEncryptedLink, getHashes, getPredecessorHashes, headsAreEqual, SignatureChain } from '/chain'
import { getChainMap, getRecentHashes, isComplete } from '/chain/recentLinks'
import { Hash } from '/util'

const depth = 5

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
  let {
    theirHead,
    lastCommonHead,
    theirNeed: hashesTheyAskedFor,
    theirDependencyMap: theirRecentHashes,
    pendingLinks,
  } = state
  const { root, head } = chain
  const ourHead = head
  const ourHashes = getHashes(chain).concat(Object.keys(pendingLinks))
  const message = { root, head } as SyncMessage<A, C>

  if (state.sendRecentHashes) {
    // send our recent hashes
    message.recentHashes = getRecentHashes({ chain, depth, prev: state.ourRecentHashes })
  }

  // CASE 1: We are synced up

  const syncedLastTime = headsAreEqual(ourHead, lastCommonHead)
  if (syncedLastTime) {
    // CASE 1a: We synced up in the last round, and they know we synced up, so we have nothing more to say
    return [state, undefined]
  }

  const syncedThisTime = headsAreEqual(ourHead, theirHead)
  if (syncedThisTime) {
    // CASE 1b: We are now synced up, but they might not know that; we'll send one last message just to confirm

    // record the fact that we've converged in our sync state
    state.lastCommonHead = ourHead
    return [state, message]
  }

  // CASE 2: We are not synced up

  let hashesWeKnowTheyNeed = [] as Hash[]
  const weAreAhead =
    theirHead.length > 0 && // if we don't know their head, we can't assume we're ahead
    theirHead.every(h => h in chain.links) // we're ahead if we already have all their heads

  if (weAreAhead) {
    // CASE 2a: we are ahead of them, so we don't need anything, AND we know exactly what they need

    // We know they have their heads and everything preceding them
    const hashesTheyHave = [...theirHead, ...theirHead.flatMap(h => getPredecessorHashes(chain, h))]
    // Send them everything else
    hashesWeKnowTheyNeed = ourHashes.filter(hash => !hashesTheyHave.includes(hash))
  } else {
    // CASE 2b: they have links we don't have; we could be behind, or we could have diverged

    if (theirRecentHashes) {
      // if they've mentioned links that we don't have, ask for them
      message.need = Object.keys(theirRecentHashes).filter(hash => !(hash in chain.links || hash in state.pendingLinks))

      // if those links still won't give us the whole picture, ask for the next set of recent hashes
      const mergedChainMap = {
        ...getChainMap(chain), // everything we know about
        ...theirRecentHashes, // their most recent links & dependencies
      }
      message.sendMoreHashes = !isComplete(mergedChainMap)
      if (!isComplete(mergedChainMap)) {
      } else {
        hashesWeKnowTheyNeed = getHashes(chain).filter(hash => !(hash in theirRecentHashes!))
      }
    }
  }

  // Send them links they need
  const hashesTheyNeed = hashesTheyAskedFor.concat(hashesWeKnowTheyNeed)
  message.links = hashesTheyNeed.reduce(
    (result, hash) => ({
      ...result,
      [hash]: getEncryptedLink(chain, hash),
    }),
    {}
  )

  // include dependency map info for links we send
  message.recentHashes = {
    ...message.recentHashes,
    ...hashesTheyNeed.reduce((result, hash) => ({ ...result, [hash]: chain.links[hash].body.prev }), {}),
  }

  // Remember what we've sent
  state.ourRecentHashes = message.recentHashes

  // We've sent them everything they've asked for, so reset their need
  state.theirNeed = []

  return [state, message]
}
