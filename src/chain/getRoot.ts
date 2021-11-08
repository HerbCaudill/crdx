import { Action, Link, SignatureChain } from './types'

export const getRoot = <A extends Action, C>(chain: SignatureChain<A, C>): Link<A, C> => chain.links[chain.root]
