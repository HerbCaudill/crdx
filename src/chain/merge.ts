import uniq from 'lodash/uniq'
import { Action, EncryptedLink, Link, HashGraph } from './types'
import { Hash } from '/util'

/**
 * Returns a new chain that contains all the information in the two chains provided.
 *
 * Note that this no longer checks the chain for validity — that is the responsibility of the
 * caller, as it's up to the caller to determine what to do about it.
 */
export const merge = <A extends Action, C>(
  /**
   * The first chain to merge. Note that this chain's values win in case there are different links
   * with the same keys, so this should be the more trusted of the two, e.g. the local one rather
   * than the remote.
   * */
  ours: HashGraph<A, C>,

  /** The second chain. This should be the less trusted of the two, e.g. the remote one.  */
  theirs: HashGraph<A, C>
): HashGraph<A, C> => {
  if (ours.root !== theirs.root) throw new Error('Cannot merge two chains with different roots')

  // The new chain will contain all the links from either chain
  const mergedLinks: Record<Hash, Link<A, C>> = { ...theirs.links, ...ours.links }
  const mergedEncryptedLinks: Record<Hash, EncryptedLink> = { ...theirs.encryptedLinks, ...ours.encryptedLinks }

  const mergedHeads: Hash[] = uniq(ours.head.concat(theirs.head))

  // If one of the heads is a parent of an existing link, it is no longer a head
  const newHeads = mergedHeads.filter(isNotParentOfAnyOf(mergedLinks))

  const mergedChain: HashGraph<A, C> = {
    root: ours.root,
    head: newHeads,
    encryptedLinks: mergedEncryptedLinks,
    links: mergedLinks,
  }

  mergedChain.head = mergedChain.head.sort()

  return mergedChain
}

/** Returns true if the given hash is not a parent of any of those links */
const isNotParentOfAnyOf =
  <A extends Action, C>(links: Record<Hash, Link<A, C>>) =>
  (h: Hash) =>
    !Object.values(links).some(isParent(h))

/** Returns true if h is the parent of the given link */
const isParent =
  <A extends Action, C>(h: Hash) =>
  (l: Link<A, C>) =>
    l.body.prev.includes(h)
