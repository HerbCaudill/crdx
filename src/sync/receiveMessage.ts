import { getMissingLinks } from './getMissingLinks'
import { BloomFilter } from './BloomFilter'
import { SyncMessage, SyncState } from './types'
import { Action, merge, SignatureChain } from '/chain'
import { assert, Hash, unique } from '/util'

/**
 * Receives a sync message from a peer and possibly updates our chain with information from them. It
 * also processes any information they've provided about what they need, so that we can send that
 * information in our next message.
 * @returns A tuple `[chain, state]` containing our updated chain and our updated sync state with
 * this peer.
 * */
export const receiveMessage = <A extends Action, C>(
  /** Our current chain */
  chain: SignatureChain<A, C>,
  /** Our sync state with this peer */
  state: SyncState,
  /** The sync message they've just sent */
  {
    root: theirRoot, //
    head: theirHead,
    links: newLinks = {},
    need = [],
    encodedFilter,
  }: SyncMessage<A, C>
): [SignatureChain<A, C>, SyncState] => {
  // This should never happen, but just as a sanity check
  assert(chain.root === theirRoot, `Can't sync chains with different roots`)

  // 1. What did they send? Do we need anything else?

  state.theyHaveSent = state.theyHaveSent.concat(Object.keys(newLinks))

  // store the new links in state, in case we can't merge yet
  state.pendingLinks = { ...state.pendingLinks, ...newLinks }

  // try to reconstruct their chain by combining the links we know of with the links they've sent
  const theirChain = {
    root: theirRoot,
    head: theirHead,
    links: { ...chain.links, ...state.pendingLinks },
  }

  // check if our reconstruction of their chain is missing any dependencies
  state.ourNeed = getMissingLinks(theirChain)

  // if not, our reconstructed chain is good so we merge with it
  if (state.ourNeed.length === 0) {
    state.pendingLinks = {} // we've used all the pending links, clear that out
    chain = merge(chain, theirChain)
  }

  // 2. What do they need?

  state.theirNeed = need
  if (encodedFilter?.byteLength) {
    // load the Bloom filter they sent us
    const filter = new BloomFilter(encodedFilter)

    // next message, send them anything that seems to be missing from their Bloom filter
    const theyMightNeed = Object.keys(chain.links).filter(h => !filter.has(h))
    state.theirNeed = state.theirNeed.concat(theyMightNeed)
  }

  state.ourHead = chain.head
  state.theirHead = theirHead

  return [chain, state]
}
