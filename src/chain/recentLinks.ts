import { getLink } from './chain'
import { Action, DependencyMap, SignatureChain } from './types'
import { Hash } from '/util'

export const EMPTY: DependencyMap = {}

/**
 * Collects a chain's most recent links (i.e. the heads and their predecessors, up to a given
 * depth), and maps each link's hash to its parents.
 *
 * ```
 *                   ┌─ e ─ g ─┐
 *         ┌─ c ─ d ─┤         ├─ o ─┐
 *  a ─ b ─┤         └─── f ───┤     ├─ n
 *         ├──── h ──── i ─────┘     │
 *         └───── j ─── k ── l ──────┘
 * ```
 * For example, given this chain and `depth: 2`, this function would return
 * ```
 * {
 *   l: [k],
 *   n: [l, o],
 *   o: [f, g, i],
 * }
 * ```
 * This map is generated to be included in sync messages, and helps peers that have diverged from
 * each other figure out the most recent links they have in common.
 *
 */
export const getRecentHashes = <A extends Action, C>({
  chain,
  depth,
  head = chain.head,
  prev,
}: {
  /** The chain to collect links from. */
  chain: SignatureChain<A, C>

  /**
   * How far back we want to go. If omitted, we'll get a map covering the whole chain. The actual
   * number of links we'll collect depends on how much branching there is.
   */
  depth?: number

  /** The "most recent" links to work back from.  */
  head?: Hash[]

  /**
   * If we're not able to find a common ancestor with the recent links we were given, we'll ask to
   * go back further. In that case we provide the last result we got, and pick up from there.
   */
  prev?: DependencyMap
}): DependencyMap => {
  if (depth === 0) return EMPTY

  if (prev) {
    // If we're given a previous result, we want to pick up where we left off: The 'tails' of the
    // last result will be the 'heads' used to find the next set of recent links. To find the tails,
    // we collect all the parents listed in the previous result, and only include the ones that
    // aren't also included as keys, e.g. [g, f, i] in the above example.
    const allParents = Object.keys(prev).flatMap(hash => prev[hash])
    const tails = allParents.filter(hash => !(hash in prev))
    head = tails
  }

  return head.reduce((result, hash) => {
    const link = getLink(chain, hash)
    const parents = link.body.prev

    // don't look up parents we've already seen
    const parentsToLookup = parents.filter(parent => !(parent in result))

    const parentLinks = getRecentHashes({
      chain,
      depth: depth ? depth - 1 : undefined,
      head: parentsToLookup,
    })

    return {
      ...result,
      [hash]: parents,
      ...parentLinks,
    }
  }, EMPTY)
}

/** Convenience function: returns full map of the given chain */
export const getChainMap = <A extends Action, C>(chain: SignatureChain<A, C>): DependencyMap =>
  getRecentHashes({ chain })

/**
 * Returns false if there are parent hashes that are not in the map.
 */
export const isComplete = (chainMap: DependencyMap) => {
  const allDependencies = Object.values(chainMap).flat()
  const isMissing = (hash: Hash) => !(hash in chainMap)
  return !allDependencies.some(isMissing)
}
