import { Action, RootLink, SignatureChain } from './types'

export const getRoot = <A extends Action, C>(chain: SignatureChain<A, C>): RootLink<C> =>
  chain.links[chain.root] as RootLink<C>
