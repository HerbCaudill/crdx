import isEqual from 'lodash/isEqual'
import { TruncatedHashFilter } from './TruncatedHashFilter'
import { SyncMessage, SyncState } from './types'
import { Action, getHashes, getLink, getPredecessorHashes, SignatureChain } from '/chain'
import { arrayToMap, unique } from '/util'

export const generateMessage = <A extends Action, C>(
  chain: SignatureChain<A, C>,
  state: SyncState
): [SyncState, SyncMessage<A, C> | undefined] => {
  const { theirHead, lastCommonHead, ourNeed, theirNeed } = state
  const { root, head } = chain
  const ourHead = head

  state = { ...state, ourHead }
  let message: SyncMessage<A, C> | undefined

  // CASE 1: We're synced up, no more information to exchange
  if (isEqual(ourHead, lastCommonHead)) {
    message = undefined
  } else {
    message = { root, head }

    const hashesTheyAlreadyHave = [
      // we know they have their heads and everything preceding them
      ...theirHead,
      ...theirHead.flatMap(h => getPredecessorHashes(chain, h)),
    ]

    // CASE 2: we are ahead of them, so we know exactly what they need
    const theyAreBehind = theirHead.length && theirHead.every(h => h in chain.links)
    if (theyAreBehind) {
      // figure out what they have & what they're missing
      const hashesTheyNeed = getHashes(chain).filter(hash => !hashesTheyAlreadyHave.includes(hash))

      message.links = hashesTheyNeed
        .map(hash => getLink(chain, hash)) // look the links corresponding to each hash
        .reduce(arrayToMap('hash'), {}) // turn into map
    } else {
      // CASE 3: we have divergent chains

      // Let them know what we have

      // build a probabilistic filter representing the hashes we have that we think they may need
      // (omitting anything we know they already have)
      const hashesTheyMightNeed = getHashes(chain).filter(hash => !hashesTheyAlreadyHave.includes(hash))
      const filter = new TruncatedHashFilter()
      filter.addHashes(hashesTheyMightNeed)
      message.encodedFilter = filter.save() // send compact representation of the filter

      // Request what we need
      message.need = ourNeed
    }

    // Send them anything they've requested
    const linksTheyRequested = theirNeed
      .map(hash => getLink(chain, hash)) // look up each link
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
