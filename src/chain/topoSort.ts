import { getChildren } from './getChildren'
import { Action, isRootLink, Link, SignatureChain } from '/chain/types'
import { Hash } from '/util'

/** Flattens a signature chain into a sequence  */
export const topoSort = <A extends Action, C>(
  chain: SignatureChain<A, C>,
  options: TopoSortOptions = {}
): Link<A, C>[] => {
  const { comparator = byHash } = options

  // Kahn's algorithm
  // Start with all the links in the chain, in no particular order
  var links = Object.values(chain.links)

  // Create a lookup table to keep track of how many remaining parents each link has
  const parentCount: Record<Hash, number> = links.reduce(
    (result, link) => ({
      ...result,
      [link.hash]: isRootLink(link) ? 0 : link.body.prev.length,
    }),
    {}
  )

  // This will be the final sorted list
  const sorted: Link<A, C>[] = []

  while (links.length > 0) {
    const queue = links
      // find links that have no remaining parents
      .filter(link => parentCount[link.hash] === 0)
      // use the comparator to sort them (by hash, if none provided)
      .sort(comparator)

    // take the first link in the queue and add it to the sorted list
    const nextLink = queue.shift()
    take(nextLink)
  }

  return sorted

  /** Takes the given link to be next in the sorted list, along with any direct children in an uininterrupted sequence */
  function take(link?: Link<A, C>) {
    if (!link) return

    // add it to the sorted list
    sorted.push(link)

    // remove it from the list of links to process
    links = links.filter(l => l.hash !== link.hash)

    // any links that had it as a parent now have one less parent
    var children = getChildren(chain, link.hash)
    children.forEach(child => parentCount[child]--)

    /*  
    The following change to the algorithm isn't stricly necessary, but it seems cleaner to me. 
    I want any links that are part of an uninterrupted sequence of links (with no branching or
    merging) to stay together. For example, in this chain, I want the sequences `cd`, `hi`, 
    `jkl`, and `eg` to stay together. But Kahn's algorithm will add `chj`, then `dik`, and so on.

                     ┌─ e ─ g ─┐
           ┌─ c ─ d ─┤         ├─ o ─┐
    a ─ b ─┤         └─── f ───┤     ├─ n
           ├──── h ──── i ─────┘     │ 
           └───── j ─── k ── l ──────┘           
    */

    // if we have a single child
    if (children.length !== 1) return

    // and we are its only parent
    const childHash = children[0]
    if (parentCount[childHash] > 0) return

    // then recursively add it to the sorted list as well
    const child = chain.links[childHash]
    take(child)
  }
}

/** By default, we use the links' hashes to order them in an arbitrary but predictable sequence. */
export const byHash: LinkComparator = (a, b) => (a.hash < b.hash ? -1 : a.hash > b.hash ? 1 : 0)

/** Any function that takes two links and tells us which comes first can be used as a comparator. */
export type LinkComparator = (a: Link<any, any>, b: Link<any, any>) => -1 | 0 | 1

export type TopoSortOptions = {
  comparator?: LinkComparator
}
