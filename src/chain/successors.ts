import uniq from 'lodash/uniq'
import { getChildrenHashes } from './children'
import { Action, Link, SignatureChain } from './types'
import { memoize } from '/util'

export const getSuccessorHashes = memoize((chain: SignatureChain<any, any>, hash: string): string[] => {
  if (!(hash in chain.links)) return []
  const children = getChildrenHashes(chain, hash)
  const successors = children.flatMap(parent => getSuccessorHashes(chain, parent))
  return uniq(children.concat(successors))
})

/** Returns the set of successors of `link` (not including `link`) */
export const getSuccessors = <A extends Action, C>(chain: SignatureChain<A, C>, link: Link<A, C>): Link<A, C>[] =>
  getSuccessorHashes(chain, link.hash)
    .map(h => chain.links[h])
    .filter(link => link !== undefined)

export const isSuccessorHash = (chain: SignatureChain<any, any>, a: string, b: string) =>
  getSuccessorHashes(chain, b).includes(a)

/** Returns true if `a` is a successor of `b` */
export const isSuccessor = <A extends Action, C>(
  chain: SignatureChain<A, C>,
  a: Link<A, C>,
  b: Link<A, C>
): boolean => {
  return (
    a !== undefined &&
    b !== undefined &&
    a.hash in chain.links &&
    b.hash in chain.links &&
    getSuccessorHashes(chain, b.hash).includes(a.hash)
  )
}
