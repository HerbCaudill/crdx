import { Action, HashGraph } from '/chain/types'

export function getMissingLinks<A extends Action, C>(chain: HashGraph<A, C>) {
  // collect all the `prev` hashes from all of the links in the chain
  const parentHashes = Object.values(chain.links) //
    .flatMap(link => link.body.prev) as string[]

  // together with the head and the root, these are all the hashes we know about
  const allKnownHashes = parentHashes.concat(chain.root, ...chain.head)

  // filter out the ones we already have, so we can ask for the ones we're missing
  return allKnownHashes.filter(hash => !(hash in chain.links))
}
