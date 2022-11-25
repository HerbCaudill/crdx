import memoize from 'lodash/memoize'
import { getHashes, getLink } from '/graph/graph'
import { isPredecessorHash } from '/graph/predecessors'
import { isSuccessorHash } from '/graph/successors'
import { Action, Link, Graph } from '/graph/types'
import { Hash } from '/util'

/** Returns all links that are concurrent with the given link. */
export const getConcurrentLinks = <A extends Action, C>(graph: Graph<A, C>, link: Link<A, C>): Link<A, C>[] => {
  return getConcurrentHashes(graph, link.hash).map(hash => getLink(graph, hash))
}

export const getConcurrentHashes = (graph: Graph<any, any>, hash: Hash): Hash[] => {
  const concurrencyLookup = calculateConcurrency(graph)
  return concurrencyLookup[hash]
}

/**
 * Creates a lookup (by hash) containing the hashes of all links that are concurrent with the
 * corresponding link.
 *  ```
 * {
 *    hash: [childHash, childHash, ...],
 *    hash: [childHash, childHash, ...],
 * }
 * ```
 */
export const calculateConcurrency = memoize(<A extends Action, C>(graph: Graph<A, C>) => {
  const concurrencyLookup = {} as Record<Hash, Hash[]>

  // for each link, find all links that are concurrent with it
  for (const a in graph.links)
    concurrencyLookup[a] = getHashes(graph)
      .filter(b => isConcurrent(graph, a, b))
      .sort()

  return concurrencyLookup
})

export const isConcurrent = <A extends Action, C>(graph: Graph<A, C>, a: Hash, b: Hash) =>
  a !== b && // a link isn't concurrent with itself
  !isPredecessorHash(graph, a, b) && // a link isn't concurrent with any of its predecessors
  !isSuccessorHash(graph, a, b) // a link isn't concurrent with any of its successors

export const getConcurrentBubbles = <A extends Action, C>(graph: Graph<A, C>): Hash[][] => {
  const seen: Record<Hash, boolean> = {}

  // returns an array containing the given hash and all hashes directly or indirectly concurrent with it
  const getBubble = (a: Hash) => {
    const bubble = [a]
    for (const b of getConcurrentHashes(graph, a))
      if (!seen[b]) {
        seen[b] = true
        bubble.push(...getBubble(b))
      }
    return bubble
  }

  const bubbles: Hash[][] = []
  for (const hash in graph.links)
    if (!seen[hash]) {
      seen[hash] = true
      const bubble = getBubble(hash)
      if (bubble.length > 1) {
        bubbles.push(bubble)
      }
    }

  return bubbles
}
