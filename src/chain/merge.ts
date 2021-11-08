import { uniq } from 'lodash'
import { Action, Link, SignatureChain } from './types'
import { Hash } from '/util'

/**
 * Returns a new chain that contains all the information in the two chains provided.
 * @param a one chain to be merged
 * @param b the other chain to be merged
 * @returns the merged chain
 */
export const merge = <A extends Action, C>(a: SignatureChain<A, C>, b: SignatureChain<A, C>): SignatureChain<A, C> => {
  if (a.root !== b.root) throw new Error('Cannot merge two chains with different roots')

  // TODO: Ensure that the chains are correctly formed, etc.
  // assertIsValid(a)
  // assertIsValid(b)

  // The new chain will contain all the links from either chain
  const mergedLinks: Record<Hash, Link<A, C>> = { ...a.links, ...b.links }

  const mergedHeads: Hash[] = uniq(a.head.concat(b.head))
  const existingLinks = Object.values(mergedLinks)

  // If one of the heads is a parent of an existing link, it is no longer a head
  const newHeads = mergedHeads.filter(isNotParentOfAnyOf(existingLinks))

  const mergedChain: SignatureChain<A, C> = {
    root: a.root,
    head: newHeads,
    links: mergedLinks,
  }

  mergedChain.head = mergedChain.head.sort()

  return mergedChain
}

/**
 * @param links
 * @returns true if the given hash is not a parent of any of those links
 */
const isNotParentOfAnyOf = (links: Link<any, any>[]) => (h: Hash) => {
  return !links.some(isParent(h))
}

// Returns true if h is the parent of the given link
const isParent = (h: Hash) => (l: Link<any, any>) => l.body.prev.includes(h)
