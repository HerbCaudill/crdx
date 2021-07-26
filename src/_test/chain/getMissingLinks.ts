import { getParentHashes } from '/chain/predecessors'
import { Action, SignatureChain } from '/chain/types'

export function getMissingLinks<A extends Action, C>(chain: SignatureChain<A, C>) {
  const parentHashes = Object.values(chain.links) //
    .flatMap(link => getParentHashes(link)) as string[]
  return parentHashes //
    .concat([chain.root, chain.head])
    .filter(hash => !(hash in chain.links))
}
