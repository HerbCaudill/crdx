import { Action, Link, HashGraph } from './types'
import { Hash } from '/util'

export const getRoot = <A extends Action, C>(chain: HashGraph<A, C>) => chain.links[chain.root]

export const getHead = <A extends Action, C>(chain: HashGraph<A, C>) => chain.head.map(hash => getLink(chain, hash))

export const getHashes = (chain: HashGraph<any, any>) => Object.keys(chain.links)

export const getLink = <A extends Action, C>(chain: HashGraph<A, C>, hash: Hash) => chain.links[hash]

export const getEncryptedLink = (chain: HashGraph<any, any>, hash: Hash) => chain.encryptedLinks[hash]

export const getEncryptedLinks = (chain: HashGraph<any, any>, hashes: Hash[]) =>
  hashes.reduce(
    (result, hash) => ({
      ...result,
      [hash]: getEncryptedLink(chain, hash),
    }),
    {}
  )

export function getParents<A extends Action, C>(chain: HashGraph<A, C>, link: Link<A, C>): Link<A, C>[]
export function getParents(chain: HashGraph<any, any>, hash: Hash): Hash[]
export function getParents<A extends Action, C>(chain: HashGraph<A, C>, linkOrHash: Link<A, C> | Hash) {
  if (typeof linkOrHash === 'string') {
    const hash: Hash = linkOrHash
    return getLink(chain, hash).body.prev
  } else {
    const link: Link<A, C> = linkOrHash
    return link.body.prev.map(hash => getLink(chain, hash))
  }
}
