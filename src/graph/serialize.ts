import { base58 } from '@herbcaudill/crypto'
import { decryptGraph } from './decrypt'
import { getChildMap } from './getParentMap'
import { Action, EncryptedGraph, Graph, LinkMap } from './types'
import { KeysetWithSecrets } from '/keyset'
import msgpack from 'msgpack-lite'

export const serialize = <A extends Action, C>(graph: Graph<A, C>) => {
  // only persist the encrypted links
  const { links, ...encryptedGraph } = graph

  // to decrypt the graph, we'll need to know its dependency structure
  const childMap = getChildMap(graph)

  return base58.encode(msgpack.encode({ childMap, encryptedGraph }))
}

export const deserialize = <A extends Action, C>(serialized: string, keys: KeysetWithSecrets): Graph<A, C> => {
  const deserialized = msgpack.decode(base58.decode(serialized))

  const { encryptedGraph, childMap } = deserialized as {
    encryptedGraph: EncryptedGraph
    childMap: LinkMap
  }

  return decryptGraph({ encryptedGraph, keys })
  // return decryptGraph({ encryptedGraph, keys, childMap })
}
