import { TruncatedHashFilter } from './TruncatedHashFilter'
import { SyncMessage, SyncState } from './types'
import { Action, getHead, getPredecessorHashes, isPredecessor, SignatureChain } from '/chain'
import { arrayToMap, assert, truncateHashes, unique } from '/util'

export const generateMessage = <A extends Action, C>(
  chain: SignatureChain<A, C>,
  state: SyncState
): [SyncState, SyncMessage<A, C> | undefined] => {
  const { theirHead, lastCommonHead, ourNeed, theirNeed } = state
  const { root, head } = chain
  const ourHead = head

  state = { ...state, ourHead }
  let message: SyncMessage<A, C> | undefined

  if (lastCommonHead === ourHead) {
    // CASE 1: We're synced up, no more information to exchange
    message = undefined
  } else {
    message = { root, head }

    const theyAreBehind =
      theirHead && theirHead in chain.links && isPredecessor(chain, chain.links[theirHead], getHead(chain))

    if (theyAreBehind) {
      // CASE 2: we are ahead of them, so we know exactly what they need

      const hashesTheyAlreadyHave = [
        // we know they have their head and everything preceding it
        theirHead,
        ...getPredecessorHashes(chain, theirHead),
        // don't send links we've already sent
        ...state.weHaveSent,
      ]

      // send them all other links
      const hashesTheyNeed = Object.keys(chain.links).filter(hash => !hashesTheyAlreadyHave.includes(hash))
      message.links = hashesTheyNeed
        .map(hash => chain.links[hash]) // look the links corresponding to each hash
        .reduce(arrayToMap('hash'), {}) // turn into map
    } else {
      // CASE 3: we have divergent chains

      // 1. Let them know what we have

      // build a probabilistic filter representing the hashes we have that we think they may need
      // (omitting anything we know they already have)
      const hashesTheyAlreadyHave = lastCommonHead ? [lastCommonHead, getPredecessorHashes(chain, lastCommonHead)] : []
      const hashesTheyMightNeed = Object.keys(chain.links).filter(hash => !hashesTheyAlreadyHave.includes(hash))

      const filter = new TruncatedHashFilter()
      filter.addHashes(hashesTheyMightNeed)
      message.encodedFilter = filter.save() // send compact representation of the filter

      // 2. Request what we need
      message.need = state.ourNeed
    }

    // Send them anything they've requested
    const linksTheyRequested = state.theirNeed
      .map(hash => chain.links[hash]) // look up each link
      .reduce(arrayToMap('hash'), {}) // put links in a map

    message.links = {
      ...message.links,
      ...linksTheyRequested,
    }
    state.theirNeed = []

    const sendingNow = Object.keys(message.links ?? {})
    state.weHaveSent = unique([...state.weHaveSent, ...sendingNow])
  }

  return [state, message]
}
