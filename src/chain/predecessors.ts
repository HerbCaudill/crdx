import { Action, Link, HashGraph } from './types'
import { Hash, memoize } from '/util'
import uniq from 'lodash/uniq'
import { getLink } from './chain'

export const getPredecessorHashes = memoize((chain: HashGraph<any, any>, hash: Hash): Hash[] => {
  const parents: Hash[] = getLink(chain, hash)?.body.prev || []
  const predecessors = parents.flatMap(parent => getPredecessorHashes(chain, parent))
  return uniq(parents.concat(predecessors))
})

/** Returns the set of predecessors of `link` (not including `link`) */
export const getPredecessors = <A extends Action, C>(chain: HashGraph<A, C>, link: Link<A, C>): Link<A, C>[] =>
  getPredecessorHashes(chain, link.hash)
    .map(h => chain.links[h])
    .filter(link => link !== undefined)

/** Returns true if `a` is a predecessor of `b` */
export const isPredecessorHash = (chain: HashGraph<any, any>, a: string, b: string) =>
  getPredecessorHashes(chain, b).includes(a)

/** Returns true if `a` is a predecessor of `b` */
export const isPredecessor = (chain: HashGraph<any, any>, a: Link<any, any>, b: Link<any, any>) => {
  return (
    a !== undefined &&
    b !== undefined &&
    a.hash in chain.links &&
    b.hash in chain.links &&
    getPredecessorHashes(chain, b.hash).includes(a.hash)
  )
}
