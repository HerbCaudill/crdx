import { TruncatedHashFilter } from './TruncatedHashFilter'
import { SyncPayload, SyncState } from './types'
import { Action, getHead, getPredecessorHashes, isPredecessor, SignatureChain } from '/chain'
import { arrayToMap, truncateHashes, unique } from '/util'

export const generateMessage = <A extends Action, C>(
  chain: SignatureChain<A, C>,
  state: SyncState
): [SyncState, SyncPayload<A, C> | undefined] => {
  const { theirHead, lastCommonHead, ourNeed, theirNeed } = state
  const { root, head } = chain
  const ourHead = head

  state = { ...state, ourHead }
  let message: SyncPayload<A, C> | undefined

  if (lastCommonHead === ourHead) {
    // CASE 1: Everyone knows we're synced up, no more information to exchange
    message = undefined
  } else {
    message = { root, head }

    const theyAreBehind =
      theirHead &&
      theirHead in chain.links &&
      isPredecessor(chain, chain.links[theirHead], getHead(chain)) &&
      !theirNeed.length

    if (theirHead === ourHead) {
      // CASE 2: we converged with the last message we received

      // (we still want to send them a final message so they know we're done)
      state.lastCommonHead = ourHead
    } else if (theirHead && theyAreBehind) {
      // CASE 3: we are ahead of them, so we know exactly what they need

      // they already have their head and everything preceding it
      const hashesTheyAlreadyHave = [theirHead, ...getPredecessorHashes(chain, theirHead)]

      // send them everything we have that they don't already have
      message.links = Object.keys(chain.links)
        .filter(hash => !hashesTheyAlreadyHave.includes(hash)) // exclude what they have
        .filter(hash => !state.weHaveSent.includes(hash)) // exclude what we've already sent
        .map(hash => chain.links[hash]) // look up the link
        .reduce(arrayToMap('hash'), {}) // turn into map
    } else {
      // CASE 4: we have divergent chains

      // build a probabilistic filter representing the hashes we think they may need
      const alreadySynced = lastCommonHead
        ? getPredecessorHashes(chain, lastCommonHead) // omit what they already have
        : []
      const hashesTheyMightNeed = Object.keys(chain.links)
        .filter(hash => hash !== lastCommonHead) // omit last common head
        .filter(hash => !alreadySynced.includes(hash)) // and its predecessors

      const filter = new TruncatedHashFilter().addHashes(hashesTheyMightNeed)
      message.encodedFilter = filter.save() // send compact representation of the filter

      // send them any links we know they need
      message.links = theirNeed
        .map(hash => chain.links[hash]) // look up each link
        .reduce(arrayToMap('hash'), {}) // put links in a map

      state.theirNeed = []

      // our missing dependencies
      message.need = ourNeed
    }

    const sendingNow = Object.keys(message.links ?? {})
    state.weHaveSent = unique([...state.weHaveSent, ...sendingNow])
  }

  return [state, message]
}
