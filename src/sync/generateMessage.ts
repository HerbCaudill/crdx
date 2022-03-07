import { BloomFilter } from './BloomFilter'
import { SyncMessage, SyncState } from './types'
import {
  Action,
  getEncryptedLink,
  getHashes,
  getLink,
  getPredecessorHashes,
  headsAreEqual,
  SignatureChain,
} from '/chain'
import { arrayToMap } from '/util'

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
  let { theirHead, lastCommonHead, ourNeed, theirNeed } = state
  const { root, head } = chain
  const ourHead = head
  const ourHashes = getHashes(chain)
  const message = { root, head } as SyncMessage<A, C>

  const syncedLastTime = headsAreEqual(ourHead, lastCommonHead)
  const syncedThisTime = headsAreEqual(ourHead, theirHead)
  const weAreAhead =
    theirHead.length > 0 && // if we don't know their head, we can't assume we're ahead
    theirHead.every(h => h in chain.links)

  // CASE 1: We are synced up

  // CASE 1a: We synced up in the last round, and they know we synced up, so we have nothing more to say
  if (syncedLastTime) return [state, undefined]

  // CASE 1b: We are now synced up, but they might know know that; we'll send one last message just to confirm
  if (syncedThisTime) {
    // record the fact that we've converged in our sync state
    state.lastCommonHead = ourHead
    return [state, message]
  }

  // CASE 2: We are not synced up

  if (weAreAhead) {
    // CASE 2a: we are ahead of them, so we don't need anything, AND we know exactly what they need

    // They have their heads and everything preceding them
    const hashesTheyHave = [...theirHead, ...theirHead.flatMap(h => getPredecessorHashes(chain, h))]
    // Send them everything else
    const hashesTheyAreMissing = ourHashes.filter(hash => !hashesTheyHave.includes(hash))
    theirNeed = theirNeed.concat(hashesTheyAreMissing)
  } else {
    // CASE 2b: we are not ahead of them -- we could be behind, or we could have diverged

    // Send them a Bloom filter so they'll know what we have
    message.encodedFilter = new BloomFilter(ourHashes).save()
    message.need = ourNeed // We'll also let them know any specific links we've previously identified that we're missing
  }

  // Send them links they need
  message.links = theirNeed
    .map(h => getEncryptedLink(chain, h)) // look up each link
    .reduce(arrayToMap('hash'), {}) // put links in a map

  // Remember what we've sent
  state.weHaveSent = state.weHaveSent.concat(theirNeed)
  // We've sent them everything they've asked for, so reset their need
  state.theirNeed = []

  return [state, message]
}
