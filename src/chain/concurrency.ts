import memoize from 'lodash/memoize'
import { getHashes, getLink } from '/chain/chain'
import { isPredecessorHash } from '/chain/predecessors'
import { isSuccessorHash } from '/chain/successors'
import { Action, Link, SignatureChain } from '/chain/types'
import { Hash } from '/util'

/** Returns all links that are concurrent with the given link. */
export const getConcurrentLinks = <A extends Action, C>(
  chain: SignatureChain<A, C>,
  link: Link<A, C>
): Link<A, C>[] => {
  return getConcurrentHashes(chain, link.hash).map(hash => getLink(chain, hash))
}

export const getConcurrentHashes = (chain: SignatureChain<any, any>, hash: Hash): Hash[] => {
  const concurrencyLookup = calculateConcurrency(chain)
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
export const calculateConcurrency = memoize(<A extends Action, C>(chain: SignatureChain<A, C>) => {
  const concurrencyLookup = {} as Record<Hash, Hash[]>

  // for each link, find all links that are concurrent with it
  for (const a in chain.links)
    concurrencyLookup[a] = getHashes(chain)
      .filter(b => isConcurrent(chain, a, b))
      .sort()

  return concurrencyLookup
})

export const isConcurrent = <A extends Action, C>(chain: SignatureChain<A, C>, a: Hash, b: Hash) =>
  a !== b && // a link isn't concurrent with itself
  !isPredecessorHash(chain, a, b) && // a link isn't concurrent with any of its predecessors
  !isSuccessorHash(chain, a, b) // a link isn't concurrent with any of its successors

export const getConcurrentBubbles = <A extends Action, C>(chain: SignatureChain<A, C>): Hash[][] => {
  const seen: Record<Hash, boolean> = {}

  // returns an array containing the given hash and all hashes directly or indirectly concurrent with it
  const getBubble = (a: Hash) => {
    const bubble = [a]
    for (const b of getConcurrentHashes(chain, a))
      if (!seen[b]) {
        seen[b] = true
        bubble.push(...getBubble(b))
      }
    return bubble
  }

  const bubbles: Hash[][] = []
  for (const hash in chain.links)
    if (!seen[hash]) {
      seen[hash] = true
      const bubble = getBubble(hash)
      if (bubble.length > 1) {
        bubbles.push(bubble)
      }
    }

  return bubbles
}
