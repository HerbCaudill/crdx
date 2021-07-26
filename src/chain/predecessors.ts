import { Action, isMergeLink, isRootLink, Link, SignatureChain } from './types'
import { memoize } from '/util'
import uniq from 'lodash/uniq'

export const getPredecessorHashes = memoize((chain: SignatureChain<any, any>, hash: string): string[] => {
  if (!(hash in chain.links)) return []
  const parents = getParentHashes(chain.links[hash])
  const predecessors = parents.flatMap(parent => getPredecessorHashes(chain, parent))
  return uniq(parents.concat(predecessors))
})

export const isPredecessorHash = (chain: SignatureChain<any, any>, a: string, b: string) =>
  getPredecessorHashes(chain, b).includes(a)

export const getCommonPredecessorHash = memoize((chain: SignatureChain<any, any>, a: string, b: string) => {
  if (a === b) return a

  // does one precede the other?
  if (isPredecessorHash(chain, a, b)) return a
  if (isPredecessorHash(chain, b, a)) return b

  const aPredecessors = getPredecessorHashes(chain, a)
  const bPredecessors = getPredecessorHashes(chain, b)
  return aPredecessors.find(link => bPredecessors.includes(link))
})

export const getParents = (chain: SignatureChain<any, any>, link: Link<any, any>) =>
  getParentHashes(link).map(hash => chain.links[hash])

export const getParentHashes = (link: Link<any, any>): string[] =>
  isRootLink(link)
    ? [] // root link = 0 parents
    : isMergeLink(link)
    ? [...link.body] // merge link = 2 parents
    : [link.body.prev] // normal link = 1 parent

/** Returns true if `a` is a predecessor of `b` */
export const isPredecessor = <A extends Action, C>(
  chain: SignatureChain<A, C>,
  a: Link<A, C>,
  b: Link<A, C>
): boolean => {
  return (
    a !== undefined &&
    b !== undefined &&
    a.hash in chain.links &&
    b.hash in chain.links &&
    getPredecessorHashes(chain, b.hash).includes(a.hash)
  )
}

/** Returns the set of predecessors of `link` (not including `link`) */
export const getPredecessors = <A extends Action, C>(chain: SignatureChain<A, C>, link: Link<A, C>): Link<A, C>[] =>
  getPredecessorHashes(chain, link.hash)
    .map(h => chain.links[h])
    .filter(link => link !== undefined)

export const getCommonPredecessor = <A extends Action, C = Action>(
  chain: SignatureChain<A, C>,
  a: Link<A, C>,
  b: Link<A, C>
) => {
  const hash = getCommonPredecessorHash(chain, a.hash, b.hash)
  if (!hash) throw new Error('no common predecessor was found')
  return chain.links[hash]
}
