import { getRoot } from './getRoot'
import { getChildren } from './getChildren'
import { Sequence, Action, SignatureChain, Link } from './types'
import { isPredecessor } from '.'

/**
 * Identifies concurrent branches that need to be resolved.
 * @param chain
 */
export const getAllBranches = <A extends Action, C>(chain: SignatureChain<A, C>): ConcurrentBranchSet<A, C>[] => {
  const result: ConcurrentBranchSet<A, C>[] = []

  // start at the root
  let link: Link<A, C> = getRoot(chain)
  while (link) {
    const children: Link<A, C>[] = getChildren(chain, link.hash).map(hash => chain.links[hash])
    if (children.length === 0) {
      // no children, stop
      break
    } else if (children.length === 1) {
      // one child, move on to the child
      link = children[0]
    } else {
      // multiple children, create a new branch set
      const [branches, mergePoint] = getBranches(children)
      result.push(branches)
      // if the branches didn't merge, we're done
      if (!mergePoint) break
      else link = mergePoint
    }
  }
  return result

  function getBranches(branchRoots: Link<A, C>[]): [ConcurrentBranchSet<A, C>, Link<A, C> | undefined] {
    // TODO: I don't love that mergePoint is modified as a side effect of getBranch
    var mergePoint: Link<A, C> | undefined

    // TODO: find the merge point explicitly first.
    // we'll need to keep track of the depth -- each time we find another branch point, increment by one
    const branches: ConcurrentBranchSet<A, C> = branchRoots.map(child => getBranch(child, link!))
    return [branches, mergePoint]

    function getBranch(current: Link<A, C>, parent: Link<A, C>): Sequence<A, C> {
      const grandchildren: Link<A, C>[] = getChildren(chain, current.hash).map(hash => chain.links[hash])
      if (branchRoots.every(branchRoot => isPredecessor(chain, branchRoot, current))) {
        // this link has the other branch roots as predecessors, so we're at a merge point; stop
        mergePoint = current
        return []
      }
      if (grandchildren.length === 0) {
        // no children, this is the last link in the branch
        return [current]
      }
      if (grandchildren.length === 1) {
        // one child, move on to the child and recurse
        const restOfBranch = getBranch(grandchildren[0], parent)
        return [current].concat(restOfBranch)
      }
      // TODO multiple children, create a new branch set
      // const [branches, mergePoint] = getBranches(grandchildren)
      return []
    }
  }
}

type ConcurrentBranchSet<A extends Action, C> = Sequence<A, C>[]
