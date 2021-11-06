import { getChildren } from './getChildren'
import { Action, isRootLink, Link, SignatureChain } from '/chain/types'
import { Hash } from '/util'

/** By default,   */
const byHash: LinkComparator = (a, b): -1 | 0 | 1 => {
  return a.hash < b.hash ? -1 : a.hash > b.hash ? 1 : 0
}

export const topoSort = <A extends Action, C>(
  chain: SignatureChain<A, C>,
  options: TopoSortOptions = {}
): Link<A, C>[] => {
  const { comparator = byHash } = options

  // Kahn's algorithm
  // Start with all the links in the chain, in no particular order
  var links = Object.values(chain.links)

  // Create a lookup table to keep track of how many remaining parents each link has
  const getParentCount = (link: Link<any, any>) => (isRootLink(link) ? 0 : link.body.prev.length)
  const parentCount: Record<Hash, number> = links.reduce(
    (dict, link) => ({
      ...dict,
      [link.hash]: getParentCount(link),
    }),
    {}
  )

  // This will be the final sorted list
  const sorted: Link<A, C>[] = []

  while (links.length > 0) {
    // find links that have no remaining parents
    const queue = links.filter(link => parentCount[link.hash] === 0)

    // using the comparator to determine the order, add the first link in the queue to the sorted list
    const link = queue.sort(comparator).shift()!
    take(link)
  }

  return sorted

  /** Adds the given link to the sorted list, along with any direct children in an uininterrupted sequence */
  function take(link: Link<A, C>) {
    // add it to the sorted list
    sorted.push(link)

    // remove it from the list of links to process
    links = links.filter(l => l.hash !== link.hash)

    // any links that had it as a parent now have one less parent
    getChildren(chain, link.hash).forEach(child => (parentCount[child] -= 1))

    /*  
    The following change to the algorithm isn't stricly necessary, but it seems cleaner to me. 
    I want any links that are part of an uninterrupted sequence of links (with no branching or
    merging) to stay together. For example, in this chain, I want the sequences `c d`, `h i`, `j k
    l`, and `e g` to stay together. But Kahn's algorithm will add `c h j`, then `d i k`, and so on.

                     ┌─ e ─ g ─┐
           ┌─ c ─ d ─┤         ├─ o ─┐
    a ─ b ─┤         └─── f ───┤     ├─ n
           ├──── h ──── i ─────┘     │ 
           └───── j ─── k ── l ──────┘           
    */

    // if we have a single child ...
    var children = getChildren(chain, link.hash)
    if (children.length !== 1) return

    // and it's not a merge point...
    const childHash = children[0]
    if (parentCount[childHash] > 0) return

    // then recursively add it to the sorted list as well
    const child = chain.links[childHash]
    take(child)
  }
}

export type LinkComparator = (a: Link<any, any>, b: Link<any, any>) => -1 | 0 | 1

type TopoSortOptions = {
  comparator?: LinkComparator
}
