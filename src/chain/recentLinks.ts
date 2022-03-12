import { getLink } from './chain'
import { Action, DependencyMap, SignatureChain } from './types'
import { Hash } from '/util'

const EMPTY: DependencyMap = {}

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
 *   l: ['k'],
 *   n: ['l','o'],
 *   o: ['f','g','i'],
 * }
 * ```
 * This map is generated to be included in sync messages, and helps peers that have diverged from
 * each other figure out the most recent links they have in common.
 */
export const getRecentLinks = <A extends Action, C>({
  chain,
  depth,
  head = chain.head,
}: {
  /** The chain to collect links from. */
  chain: SignatureChain<A, C>

  /**
   * How far back we want to go. If omitted, we'll get a map covering the whole chain. The actual
   * number of links we'll collect depends on how much branching there is.
   */
  depth?: number

  /** The "most recent" links to start working back from.  */
  head?: Hash[]
}): DependencyMap => {
  if (depth === 0) return EMPTY

  return head.reduce((result, hash) => {
    const link = getLink(chain, hash)
    if (!link || !link.body) console.error(chain, hash)
    const parents = link.body.prev
    if (parents.length === 0) return result

    // don't look up parents we've already seen
    const parentsToLookup = parents.filter(parent => !(parent in result))

    const parentLinks = getRecentLinks({
      chain,
      depth: depth === undefined ? undefined : depth - 1,
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
  getRecentLinks({ chain })

/**
 * If we're not able to find a common ancestor with the recent links we were given, we'll ask
 * to go back further. This function takes the previous result and returns the next one.
 *
 * We want to start where we left off: The 'tails' of the last result will be the 'heads' used to
 * find the next set of recent links. To find the tails, we collect all the parents listed in the
 * previous result, and only include the ones that aren't also included as keys. In the above
 * example, the 'tails' would be `['g', 'f', 'i']`. We'll pass these to `getRecentLinks`,
 * along with whatever depth we choose: It could be the same each time, or we could adopt a strategy
 * of increasing the depth each time. (For example, `git fetch` increases the depth each time
 * following a Fibonacci-like sequence.)
 */
export const getMoreRecentLinks = <A extends Action, C>({
  chain,
  depth,
  prev,
}: {
  chain: SignatureChain<A, C>
  depth: number
  prev: DependencyMap
}): DependencyMap => {
  const allParents = Object.keys(prev).flatMap(hash => prev[hash])
  const tails = allParents.filter(hash => !(hash in prev))
  return getRecentLinks({ chain, depth, head: tails })
}

/**
 * Returns false if there are parent hashes that are not in the map.
 */
export const isComplete = (chainMap: DependencyMap) => {
  const allDependencies = Object.values(chainMap).flat()
  const isMissing = (hash: Hash) => !(hash in chainMap)
  return !allDependencies.some(isMissing)
}
