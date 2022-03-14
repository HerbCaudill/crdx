﻿import uniq from 'lodash/uniq'
import { Action, EncryptedLink, Link, SignatureChain } from './types'
import { Hash } from '/util'

/**
 * Returns a new chain that contains all the information in the two chains provided.
 *
 * Note that this no longer checks the chain for validity — that is the responsibility of the
 * caller, as it's up to the caller to determine what to do about it.
 */
export const merge = <A extends Action, C>(a: SignatureChain<A, C>, b: SignatureChain<A, C>): SignatureChain<A, C> => {
  if (a.root !== b.root) throw new Error('Cannot merge two chains with different roots')

  // The new chain will contain all the links from either chain
  const mergedLinks: Record<Hash, Link<A, C>> = { ...a.links, ...b.links }
  const mergedEncryptedLinks: Record<Hash, EncryptedLink<A, C>> = { ...a.encryptedLinks, ...b.encryptedLinks }

  const mergedHeads: Hash[] = uniq(a.head.concat(b.head))

  // If one of the heads is a parent of an existing link, it is no longer a head
  const newHeads = mergedHeads.filter(isNotParentOfAnyOf(mergedLinks))

  const mergedChain: SignatureChain<A, C> = {
    root: a.root,
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
