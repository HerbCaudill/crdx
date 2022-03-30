import { decryptChain } from './decrypt'
import { Action, EncryptedHashGraph, HashGraph } from './types'
import { KeysetWithSecrets } from '/keyset'

export const serialize = <A extends Action, C>(chain: HashGraph<A, C>) => {
  const { root, head, encryptedLinks } = chain
  const encryptedChain = { root, head, encryptedLinks } as EncryptedHashGraph
  return JSON.stringify(encryptedChain)
}

export const deserialize = <A extends Action, C>(serialized: string, chainKeys: KeysetWithSecrets): HashGraph<A, C> => {
  const encryptedChain = JSON.parse(serialized) as EncryptedHashGraph
  return decryptChain(encryptedChain, chainKeys)
}
