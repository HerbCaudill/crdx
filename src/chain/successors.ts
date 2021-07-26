import { getSequence } from './getSequence'
import { Action, Link, SignatureChain } from './types'

export const getSuccessors = <A extends Action, C>(chain: SignatureChain<A, C>, link: Link<A, C>): Link<A, C>[] =>
  getSequence({ chain, root: link }).filter(n => n !== link)

export const isSuccessor = <A extends Action, C>(chain: SignatureChain<A, C>, a: Link<A, C>, b: Link<A, C>): boolean =>
  getSuccessors(chain, b).includes(a)
