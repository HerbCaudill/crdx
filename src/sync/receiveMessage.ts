import { getMissingLinks } from './getMissingLinks'
import { TruncatedHashFilter } from './TruncatedHashFilter'
import { SyncMessage, SyncState } from './types'
import { Action, merge, SignatureChain } from '/chain'
import { assert, Hash, unique } from '/util'

export const receiveMessage = <A extends Action, C>(
  chain: SignatureChain<A, C>,
  state: SyncState,
  message: SyncMessage<A, C>
): [SignatureChain<A, C>, SyncState] => {
  const {
    root: theirRoot, //
    head: theirHead,
    links: newLinks = {},
    need = [],
    encodedFilter,
  } = message

  assert(chain.root === theirRoot, `Can't sync chains with different roots`)

  // 1. What did they send? Do we need anything else?

  const newHashes = Object.keys(newLinks)
  state.theyHaveSent = unique(state.theyHaveSent.concat(newHashes))

  // store the new links in state, in case we can't merge yet
  state.pendingLinks = { ...state.pendingLinks, ...newLinks }

  // try to reconstruct their chain
  const theirChain = {
    root: theirRoot,
    head: [...theirHead],
    links: { ...chain.links, ...state.pendingLinks },
  }

  // check if our reconstruction of their chain is missing any dependencies
  state.ourNeed = getMissingLinks(theirChain)

  // if we have everything we need, assume our reconstructed chain is good and merge with it
  if (!state.ourNeed.length) {
    state.pendingLinks = {} // we've used all the pending links, clear that out
    chain = merge(chain, theirChain)
  }

  // 2. What do they need?

  if (encodedFilter?.byteLength) {
    const filter = new TruncatedHashFilter().load(encodedFilter)

    const theyMightNotHave = (hash: Hash) =>
      !filter.hasHash(hash) &&
      theirRoot !== hash &&
      !theirHead.includes(hash) &&
      !state.weHaveSent.includes(hash) &&
      !state.theyHaveSent.includes(hash)

    state.theirNeed = Object.keys(chain.links).filter(theyMightNotHave)
  } else {
    state.theirNeed = need
  }

  state.ourHead = chain.head
  state.theirHead = theirHead

  return [chain, state]
}

export const headsAreEqual = (a: Hash[], b: Hash[]) => {
  if (a.length !== b.length) return false

  a.sort()
  b.sort()
  return a.every((hash, i) => hash === b[i])
}
