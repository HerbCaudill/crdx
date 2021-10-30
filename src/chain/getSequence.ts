import { baseResolver } from './baseResolver'
import { getHead } from './getHead'
import { getRoot } from './getRoot'
import { getCommonPredecessor, isPredecessor } from './predecessors'
import { Action, ActionLinkBody, isRootLink, Link, LinkBody, Resolver, Sequence, SignatureChain } from './types'

/**
 * Takes a `SignatureChain` and returns a flat array of links by recursively performing a
 * topographical sort and filter. For example, this chain
 * ```
 *                      ┌─ e ─ g ─┐
 *            ┌─ c ─ d ─┤         ├─ o(HEAD)
 *     a ─ b ─┤         └─── f ───┘
 *            └─ h ─ i(HEAD)
 * ```
 *  might be transformed to this sequence
 * ```
 *    [a, b, c, d, e, f, g, h, i]
 * ```
 *
 * The logic for merging concurrent branches is encapsulated in a `resolver` function.
 *
 * You can also get the sequence of a chain fragment, by passing a `root` and/or a `head`; this will
 * resolve the subchain starting at `root` and ending at `head`.
 */
export const getSequence = <A extends Action, C>(options: GetSequenceParams<A, C>): Link<A, C>[] => {
  const {
    chain, //
    root = getRoot(chain),
    head = getHead(chain),
    resolver = baseResolver as Resolver<A, C>,
  } = options

  // if the only head is the root,  we're done recursing
  if (head.length === 1 && head[0].hash === root.hash) return head

  // Ignore any heads that aren't descendants of the root (e.g. if we're working on a chain fragment)
  const headsToMerge = head.filter(h => isPredecessor(chain, root, h))

  if (headsToMerge.length === 1) {
    // 1 head - recurse our way backwards
    const { prev } = headsToMerge[0].body as ActionLinkBody<A, C>
    const parents = prev.map(hash => chain.links[hash])
    const predecessors = getSequence({
      ...options,
      head: parents,
    })
    return predecessors.concat(headsToMerge)
  }

  // 2 heads or more

  // Take the two closest heads, reducing the number of heads by one; then we'll recurse to process
  // the remaining head(s)

  console.log(getPayloads(headsToMerge))
  const [a, b, ...otherHeads] = headsToMerge
  const twoHeads = [a, b]

  // recursively flatten the two fragments starting at the branch point and ending at each of the two heads
  const branchPoint = getCommonPredecessor(chain, twoHeads)
  const twoBranches = twoHeads
    .map(h =>
      getSequence({
        ...options,
        root: branchPoint,
        head: [h],
      })
    )
    // remove the branch point itself from each branch
    .map(branch => branch.slice(1)) as [Sequence<A, C>, Sequence<A, C>]

  // Merge the two concurrent sequences using the resolver
  const resolvedBranches = resolver(twoBranches, chain)

  // recurse to process the remaining heads
  const remainingSequence = getSequence({
    ...options,
    head: [...otherHeads, branchPoint],
  })

  const result = remainingSequence.concat(resolvedBranches)
  // console.log(getPayloads(result))
  return result
}

type GetSequenceParams<A extends Action, C> = {
  /** The SignatureChain containing the links to be sequenced */
  chain: SignatureChain<A, C>

  /** The link to use as the chain's root (provided when processing a chain fragment) */
  root?: Link<A, C>

  /** The link(s) to use as the chain's heads (provided when processing a chain fragment) */
  head?: Link<A, C>[]

  /** The resolver to use when merging concurrent branches into a single sequence. If no resolver is
   * provided, the concurrent branches will be concatenated in an arbitrary but deterministic order. */
  resolver?: Resolver<A, C>
}

const getPayloads = (sequence: Link<any, any>[]) => {
  if (!sequence) return ''
  return sequence
    .filter(link => !isRootLink(link))
    .map(link => (link.body as LinkBody<any, any>).payload)
    .join('')
}
