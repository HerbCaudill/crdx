import { Action, RootLink, SignatureChain } from '@/chain/types'

export const getRoot = <A extends Action>(chain: SignatureChain<A>): RootLink => chain.links[chain.root] as RootLink
