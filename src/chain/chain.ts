import { Action, Link, SignatureChain } from './types'
import { Hash } from '/util'

export const getRoot = <A extends Action, C>(chain: SignatureChain<A, C>) => chain.links[chain.root]

export const getHead = <A extends Action, C>(chain: SignatureChain<A, C>) =>
  chain.head.map(hash => getLink(chain, hash))

export const getHashes = (chain: SignatureChain<any, any>) => Object.keys(chain.links)

export const getLink = <A extends Action, C>(chain: SignatureChain<A, C>, hash: Hash) => chain.links[hash]

export const getEncryptedLink = (chain: SignatureChain<any, any>, hash: Hash) => chain.encryptedLinks[hash]

export const getEncryptedLinks = (chain: SignatureChain<any, any>, hashes: Hash[]) =>
  hashes.reduce(
    (result, hash) => ({
      ...result,
      [hash]: getEncryptedLink(chain, hash),
    }),
    {}
  )

export function getParents<A extends Action, C>(chain: SignatureChain<A, C>, link: Link<A, C>): Link<A, C>[]
export function getParents(chain: SignatureChain<any, any>, hash: Hash): Hash[]
export function getParents<A extends Action, C>(chain: SignatureChain<A, C>, linkOrHash: Link<A, C> | Hash) {
  if (typeof linkOrHash === 'string') {
    const hash: Hash = linkOrHash
    return getLink(chain, hash).body.prev
  } else {
    const link: Link<A, C> = linkOrHash
    return link.body.prev.map(hash => getLink(chain, hash))
  }
}
