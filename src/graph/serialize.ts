import { base58 } from '@herbcaudill/crypto'
import { decryptGraph } from './decrypt'
import { Action, Graph } from './types'
import { Keyring, KeysetWithSecrets } from '/keyset'

export const serialize = <A extends Action, C>(graph: Graph<A, C>) => {
}

): Graph<A, C> => {

  return decryptGraph({ encryptedGraph, keys, childMap })
}
