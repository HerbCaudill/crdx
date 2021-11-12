import { byHash, topoSort } from './topoSort'
import { Action, Link, Resolver, SignatureChain } from './types'

/**
 * Takes a `SignatureChain` and returns a flat array of links by performing a topographical sort and
 * filter. For example, this chain
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
 * The logic for merging concurrent branches is captured in a `resolver` function provided by the
 * caller. A resolver takes the chain as an argument, and returns two functions:
 * - `sort` is a comparator function that indicates how concurrent branches are to be ordered.
 * - `filter` is a predicate function that indicates which links to include in the resulting
 *   sequence.
 */
export const getSequence = <A extends Action, C>(
  chain: SignatureChain<A, C>,
  resolver: Resolver<A, C> = baseResolver
) => {
  const { sort = byHash, filter = noFilter } = resolver(chain)

  const sorted = topoSort(chain, { comparator: sort })

  return sorted.filter(link => filter(link))
}

export const baseResolver: Resolver<any, any> = _ => ({})
export const noFilter = (_: Link<any, any>) => true
