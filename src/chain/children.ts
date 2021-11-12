import memoize from 'lodash/memoize'
import { getLink } from './chain'
import { Action, Link, SignatureChain } from '/chain/types'
import { Hash } from '/util'

/**
 * Returns the hashes of the children of the link with the given hash.
 */
export const getChildrenHashes = <A extends Action, C>(chain: SignatureChain<A, C>, hash: Hash): string[] => {
  const childrenLookup = calculateChildren(chain)
  return childrenLookup[hash] || []
}

export const getChildren = <A extends Action, C>(chain: SignatureChain<A, C>, link: Link<A, C>): Link<A, C>[] => {
  return getChildrenHashes(chain, link.hash).map(hash => getLink(chain, hash))
}

/**
 * Creates a lookup (by hash) containing the children of the corresponding link.
 *  ```
 * {
 *    hash: [childHash, childHash, ...],
 *    hash: [childHash, childHash, ...],
 * }
 * ```
 */
const calculateChildren = memoize(<A extends Action, C>(chain: SignatureChain<A, C>) => {
  const childrenLookup = {} as Record<Hash, Hash[]>

  // find the parents of each link, and add them to a dictionary lookup
  for (const link of Object.values(chain.links)) {
    const parents = link.body.prev
    for (const parent of parents) {
      // add this link's hash to each parent's list of children
      const children = childrenLookup[parent] || []
      children.push(link.hash)
      childrenLookup[parent] = children
    }
  }
  return childrenLookup
})
