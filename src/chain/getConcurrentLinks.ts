import { memoize } from 'lodash'
import { isPredecessorHash } from '/chain/predecessors'
import { isSuccessorHash } from '/chain/successors'
import { Action, Link, SignatureChain } from '/chain/types'
import { Hash } from '/util'

/**
 * Returns all links that are concurrent with the given link.
 */
export const getConcurrentLinks = <A extends Action, C>(
  chain: SignatureChain<A, C>,
  link: Link<A, C>
): Link<A, C>[] => {
  const concurrencyLookup = calculateConcurrency(chain)
  const concurrentLinks = concurrencyLookup[link.hash] || []
  return concurrentLinks.map(hash => chain.links[hash])
}

/**
 * Creates a lookup (by hash) containing all links that are concurrent with the corresponding link.
 *  ```
 * {
 *    hash: [childHash, childHash, ...],
 *    hash: [childHash, childHash, ...],
 * }
 * ```
 */
const calculateConcurrency = memoize(<A extends Action, C>(chain: SignatureChain<A, C>) => {
  const concurrencyLookup = {} as Record<Hash, Hash[]>

  // for each link, find all links that are neither successors nor predecessors
  const isConcurrent = (a: Hash, b: Hash) => a !== b && !isPredecessorHash(chain, a, b) && !isSuccessorHash(chain, a, b)
  for (const a of Object.keys(chain.links))
    concurrencyLookup[a] = Object.keys(chain.links).filter(b => isConcurrent(a, b))

  return concurrencyLookup
})
