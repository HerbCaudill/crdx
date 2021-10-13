import { baseResolver } from './baseResolver'
import { getHead } from './getHead'
import { getRoot } from './getRoot'
import { getCommonPredecessor, isPredecessor } from './predecessors'
import {
  Action,
  ActionLink,
  ActionLinkBody,
  isMergeLink,
  Link,
  NonMergeLink,
  Resolver,
  Sequence,
  SignatureChain,
} from './types'

/**
 * Takes a `SignatureChain` and returns an array of links by recursively performing a topographical
 * sort and filter. For example, this chain
 * ```
 *              ┌─→ c ─→ d ─┐
 *    a ─→ b ─→ ┴─→ e ───── * ─→ f
 * ```
 *  might be transformed to this sequence
 * ```
 *    [a, b, e, c, d, f]
 * ```
 *
 * The logic for merging these branches is encapsulated in a `resolver` function provided in the
 * options. In the example above, the two concurrent branches `[c, d]` and `[e]` are resolved as
 * `[e, c, d]`. A different resolver might return the links in a different order, and/or omit some
 * links; so these concurrent branches might also be resolved as:
 * ```
 *   [c, d, e]
 *   [c, e, d]
 *   [c, d]
 *   [e, d]
 *   [e]
 * ```
 * ... etc.
 *
 * You can also get the sequence of a fragment of a chain, by passing a `root` and/or a `head`; this
 * will resolve the subchain starting at `root` and ending at `head`.
 */
export const getSequence = <A extends Action, C>(options: {
  /** The SignatureChain containing the links to be sequenced */
  chain: SignatureChain<A, C>

  /** The link to use as the chain's root (used to process a subchain) */
  root?: Link<A, C>

  /** The link to use as the chain's head (used to process a subchain) */
  head?: Link<A, C>[]

  /** The resolver to use when merging concurrent branches into a single sequence. If no resolver is
   * provided, the concurrent branches will be concatenated in an arbitrary but deterministic order. */
  resolver?: Resolver<A, C>
}): NonMergeLink<A, C>[] => {
  const {
    chain, //
    root = getRoot(chain),
    resolver = baseResolver as Resolver<A, C>,
  } = options

  // TODO: this is a temporary workaround to get this working with multiple heads
  const head = options.head ? options.head[0] : getHead(chain)[0]

  let result: Link<A, C>[]

  type Branch = Sequence<A, C>

  // 0 parents (root link)
  if (head === root) {
    // just return that one node
    result = [head]
  } else if (!isMergeLink(head)) {
    // 1 parent (normal action link)
    // recurse our way backwards
    const body = (head as ActionLink<A, C>).body as ActionLinkBody<A, C>

    // TODO: this is a temporary workaround to get this working with multiple parents
    const prev = body.prev[0]

    const parent = chain.links[prev] as Link<A, C>
    const predecessors = getSequence({
      ...options,
      head: [parent],
    })
    result = [...predecessors, head]
  } else {
    // 2 parents (merge link)
    // need to resolve the two branches it merges, going back to the first common predecessor,
    // then continue from there

    // get the two links merged by the merge link
    let branchHeads = head.body.map(hash => chain.links[hash]!) as [Link<A, C>, Link<A, C>]

    // find their most recent common predecessor
    const commonPredecessor = getCommonPredecessor(chain, ...branchHeads)

    if (isPredecessor(chain, commonPredecessor, root)) {
      // The common predecessor is BEFORE the *root* we've been given, so the root lives *on* one of
      // these two branches. For example:
      // ```
      //   a ─→ b(COMMON) ─┬─→ c ─→ d ─→ e ──────── * ──→ j(HEAD)
      //                   └─→ f → g(ROOT) → h → i ─┘
      // ```
      // In this case we're only interested in the branch that the root is on; we can ignore the
      // other one. For example, in the above scenario we're resolving the branches that end in `e`
      // and `i`, respectively. But we see that common predecessor comes before the root, which
      // tells us that the root is on one of those two branches, and we're only interested in the
      // one with the root on it, starting with the root: in this case the branch `g → h → i`. And
      // we don't need to resolve that against `c → d → e`.

      // Recursively resolve the branch containing the root into a sequence.
      const isOurBranchHead = (h: Link<A, C>) => root === h || isPredecessor(chain, root, h)
      const ourBranchHead = branchHeads.find(isOurBranchHead)! // definitely exists
      result = getSequence({
        ...options,
        head: [ourBranchHead], // TODO: workaround
      })
    } else {
      // The common predecessor is AFTER the root we've been given, so we have two branches to
      // merge, going back to the most recent common predecessor. For example:
      // ```
      //   a ─→ b(ROOT) ─→ c(COMMON) ─┬─→ c ─→ d ─→ e ─── * ──→ j(HEAD)
      //                              └─→ f → g  → h → i ─┘
      // ```
      //  In this case we need to merge the branch `c → d → e` with the branch `f → g → h → i`.

      // Get the sequence for each branch (recursively)
      const root = getCommonPredecessor(chain, ...branchHeads)
      const branches = <[Branch, Branch]>branchHeads
        .map(head => getSequence({ chain, root, head: [head] })) // get the branch corresponding to each head
        .map(branch => branch.slice(1)) // omit the common predecessor itself

      // Apply the resolver to these two sequences
      const resolvedBranches = resolver(branches, chain)

      // Now we can resume making our way back from the common predecessor towards the root (also recursively)
      const predecessors = getSequence({
        ...options,
        head: [commonPredecessor],
      })

      result = [...predecessors, ...resolvedBranches, head] as Sequence<A, C>
    }
  }

  // omit merge links before returning result
  return result.filter(n => !isMergeLink(n)) as NonMergeLink<A, C>[]
}
