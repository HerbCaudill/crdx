import { Action, Link, HashGraph } from './types'
import { Hash } from '/util'

export const getRoot = <A extends Action, C>(graph: HashGraph<A, C>) => graph.links[graph.root]

export const getHead = <A extends Action, C>(graph: HashGraph<A, C>) => graph.head.map(hash => getLink(graph, hash))

export const getHashes = (graph: HashGraph<any, any>) => Object.keys(graph.links)

export const getLink = <A extends Action, C>(graph: HashGraph<A, C>, hash: Hash) => graph.links[hash]

export const getEncryptedLink = (graph: HashGraph<any, any>, hash: Hash) => graph.encryptedLinks[hash]

export const getEncryptedLinks = (graph: HashGraph<any, any>, hashes: Hash[]) =>
  hashes.reduce(
    (result, hash) => ({
      ...result,
      [hash]: getEncryptedLink(graph, hash),
    }),
    {}
  )

export function getParents<A extends Action, C>(graph: HashGraph<A, C>, link: Link<A, C>): Link<A, C>[]
export function getParents(graph: HashGraph<any, any>, hash: Hash): Hash[]
export function getParents<A extends Action, C>(graph: HashGraph<A, C>, linkOrHash: Link<A, C> | Hash) {
  if (typeof linkOrHash === 'string') {
    const hash: Hash = linkOrHash
    return getLink(graph, hash).body.prev
  } else {
    const link: Link<A, C> = linkOrHash
    return link.body.prev.map(hash => getLink(graph, hash))
  }
}
