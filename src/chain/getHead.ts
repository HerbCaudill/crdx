import { Action, Link, SignatureChain } from './types'

export const getHead = <A extends Action, C>(chain: SignatureChain<A, C>): Link<A, C> =>
  chain.links[chain.head]! as Link<A, C>
