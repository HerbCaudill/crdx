import { Action, SignatureChain } from './types'
import { Hash } from '/util'

export const getRoot = <A extends Action, C>(chain: SignatureChain<A, C>) => chain.links[chain.root]
export const getHead = <A extends Action, C>(chain: SignatureChain<A, C>) =>
  chain.head.map(hash => getLink(chain, hash))
export const getHashes = (chain: SignatureChain<any, any>) => Object.keys(chain.links)
export const getLink = <A extends Action, C>(chain: SignatureChain<A, C>, hash: Hash) => chain.links[hash]
