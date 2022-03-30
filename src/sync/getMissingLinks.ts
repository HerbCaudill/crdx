import { Action, HashGraph } from '/graph/types'

export function getMissingLinks<A extends Action, C>(graph: HashGraph<A, C>) {
  // collect all the `prev` hashes from all of the links in the graph
  const parentHashes = Object.values(graph.links) //
    .flatMap(link => link.body.prev) as string[]

  // together with the head and the root, these are all the hashes we know about
  const allKnownHashes = parentHashes.concat(graph.root, ...graph.head)

  // filter out the ones we already have, so we can ask for the ones we're missing
  return allKnownHashes.filter(hash => !(hash in graph.links))
}
