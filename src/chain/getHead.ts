import { Action, Link, SignatureChain } from './types'

export const getHead = <A extends Action, C>(chain: SignatureChain<A, C>): Link<A, C>[] =>
  chain.head.map(hash => chain.links[hash]! as Link<A, C>)
