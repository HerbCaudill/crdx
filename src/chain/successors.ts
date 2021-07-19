import { getSequence } from './getSequence'
import { Action, Link, SignatureChain } from './types'

export const getSuccessors = <A extends Action>(chain: SignatureChain<A>, link: Link<A>): Link<A>[] =>
  getSequence({ chain, root: link }).filter(n => n !== link)

export const isSuccessor = <A extends Action>(chain: SignatureChain<A>, a: Link<A>, b: Link<A>): boolean =>
  getSuccessors(chain, b).includes(a)
