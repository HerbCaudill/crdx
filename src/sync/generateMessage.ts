import { SyncMessage, SyncState } from './types'
import { Action, getEncryptedLink, getHashes, getPredecessorHashes, headsAreEqual, SignatureChain } from '/chain'
import { getChainMap, isComplete } from '/chain/recentLinks'
import { arrayToMap, truncateHashes } from '/util'

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
  let { theirHead, lastCommonHead, theirNeed, theirRecentHashes, links: pendingLinks } = state
  const { root, head } = chain
  const ourHead = head
  const ourHashes = getHashes(chain).concat(Object.keys(pendingLinks))
  const message = { root, head } as SyncMessage<A, C>

  // CASE 1: We are synced up

  // CASE 1a: We synced up in the last round, and they know we synced up, so we have nothing more to say
  const syncedLastTime = headsAreEqual(ourHead, lastCommonHead)
  if (syncedLastTime) return [state, undefined]

  // CASE 1b: We are now synced up, but they might not know that; we'll send one last message just to confirm
  const syncedThisTime = headsAreEqual(ourHead, theirHead)
  if (syncedThisTime) {
    // record the fact that we've converged in our sync state
    state.lastCommonHead = ourHead
    return [state, message]
  }

  // CASE 2: We are not synced up

  const weAreAhead =
    theirHead.length > 0 && // if we don't know their head, we can't assume we're ahead
    theirHead.every(h => h in chain.links) // we're ahead if we already have all their heads

  if (weAreAhead) {
    // CASE 2a: we are ahead of them, so we don't need anything, AND we know exactly what they need

    // We know they have their heads and everything preceding them
    const hashesTheyHave = [...theirHead, ...theirHead.flatMap(h => getPredecessorHashes(chain, h))]
    // Send them everything else
    const hashesTheyAreMissing = ourHashes.filter(hash => !hashesTheyHave.includes(hash))
    theirNeed = theirNeed.concat(hashesTheyAreMissing)
  } else {
    // CASE 2b: they have links we don't have; we could be behind, or we could have diverged

    // if they've mentioned links that we don't have, ask for them
    message.need = Object.keys(theirRecentHashes).filter(hash => !(hash in chain.links))

    // if those links still won't give us the whole picture, ask for the next set of recent hashes
    const mergedChainMap = {
      ...getChainMap(chain), // everything we know about
      ...theirRecentHashes, // their most recent links & dependencies
    }
    if (!isComplete(mergedChainMap)) message.sendMoreHashes = true
  }

  // Send them links they need
  message.links = theirNeed.reduce(
    (result, hash) => ({
      ...result,
      [hash]: getEncryptedLink(chain, hash),
    }),
    {}
  )

  // Remember what we've sent
  state.weHaveSent = state.weHaveSent.concat(theirNeed)

  // We've sent them everything they've asked for, so reset their need
  state.theirNeed = []

  console.log(truncateHashes(message))
  return [state, message]
}
