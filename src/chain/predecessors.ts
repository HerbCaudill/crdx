﻿import { Action, Link, SignatureChain } from './types'
import { memoize } from '/util'
import uniq from 'lodash/uniq'
import { getLink } from './chain'

export const getPredecessorHashes = memoize(
  <A extends Action, C>(chain: SignatureChain<A, C>, hash: string): string[] => {
    if (!(hash in chain.links)) return []
    const parents = getLink(chain, hash).body.prev
    const predecessors = parents.flatMap(parent => getPredecessorHashes(chain, parent))
    return uniq(parents.concat(predecessors))
  }
)

export const isPredecessorHash = <A extends Action, C>(chain: SignatureChain<A, C>, a: string, b: string) =>
  getPredecessorHashes(chain, b).includes(a)

export const getCommonPredecessorHash = memoize(
  <A extends Action, C>(chain: SignatureChain<A, C>, a: string, b: string) => {
    if (a === b) return a

    // does one precede the other?
    if (isPredecessorHash(chain, a, b)) return a
    if (isPredecessorHash(chain, b, a)) return b

    const aPredecessors = getPredecessorHashes(chain, a)
    const bPredecessors = getPredecessorHashes(chain, b)
    return aPredecessors.find(link => bPredecessors.includes(link))
  }
)

export const getParents = <A extends Action, C>(chain: SignatureChain<A, C>, link: Link<A, C>) =>
  link.body.prev.map(hash => getLink(chain, hash))

/** Returns true if `a` is a predecessor of `b` */
export const isPredecessor = <A extends Action, C>(
  chain: SignatureChain<A, C>,
  a: Link<A, C>,
  b: Link<A, C>
): boolean => {
  return (
    a !== undefined &&
    b !== undefined &&
    a.hash in chain.links &&
    b.hash in chain.links &&
    getPredecessorHashes(chain, b.hash).includes(a.hash)
  )
}

/** Returns the set of predecessors of `link` (not including `link`) */
export const getPredecessors = <A extends Action, C>(chain: SignatureChain<A, C>, link: Link<A, C>): Link<A, C>[] =>
  getPredecessorHashes(chain, link.hash)
    .map(h => chain.links[h])
    .filter(link => link !== undefined)

export const getCommonPredecessor = <A extends Action, C>(
  chain: SignatureChain<A, C>,
  links: Link<A, C>[]
): Link<A, C> => {
  if (links.length < 2) throw new Error('at least two links required')
  if (links.length === 2) {
    const [a, b] = links
    const hash = getCommonPredecessorHash(chain, a.hash, b.hash)
    if (!hash) throw new Error('no common predecessor was found')
    return getLink(chain, hash)
  }
  return links.reduce((result, link) => getCommonPredecessor(chain, [result, link]), links[0])
}
