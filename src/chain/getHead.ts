import { Action, Link, SignatureChain } from './types'

export const getHead = <A extends Action>(chain: SignatureChain<A>): Link<A> => chain.links[chain.head]! as Link<A>
