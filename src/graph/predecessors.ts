import { Action, Link, HashGraph } from './types'
import { Hash, memoize } from '/util'
import uniq from 'lodash/uniq'
import { getLink } from './graph'

export const getPredecessorHashes = memoize((graph: HashGraph<any, any>, hash: Hash): Hash[] => {
  const parents: Hash[] = getLink(graph, hash)?.body.prev || []
  const predecessors = parents.flatMap(parent => getPredecessorHashes(graph, parent))
  return uniq(parents.concat(predecessors))
})

/** Returns the set of predecessors of `link` (not including `link`) */
export const getPredecessors = <A extends Action, C>(graph: HashGraph<A, C>, link: Link<A, C>): Link<A, C>[] =>
  getPredecessorHashes(graph, link.hash)
    .map(h => graph.links[h])
    .filter(link => link !== undefined)

/** Returns true if `a` is a predecessor of `b` */
export const isPredecessorHash = (graph: HashGraph<any, any>, a: string, b: string) =>
  getPredecessorHashes(graph, b).includes(a)

/** Returns true if `a` is a predecessor of `b` */
export const isPredecessor = (graph: HashGraph<any, any>, a: Link<any, any>, b: Link<any, any>) => {
  return (
    a !== undefined &&
    b !== undefined &&
    a.hash in graph.links &&
    b.hash in graph.links &&
    getPredecessorHashes(graph, b.hash).includes(a.hash)
  )
}
