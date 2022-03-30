import { decryptGraph } from './decrypt'
import { Action, EncryptedHashGraph, HashGraph } from './types'
import { KeysetWithSecrets } from '/keyset'

export const serialize = <A extends Action, C>(graph: HashGraph<A, C>) => {
  const { root, head, encryptedLinks } = graph
  const encryptedGraph = { root, head, encryptedLinks } as EncryptedHashGraph
  return JSON.stringify(encryptedGraph)
}

export const deserialize = <A extends Action, C>(serialized: string, graphKeys: KeysetWithSecrets): HashGraph<A, C> => {
  const encryptedGraph = JSON.parse(serialized) as EncryptedHashGraph
  return decryptGraph(encryptedGraph, graphKeys)
}
