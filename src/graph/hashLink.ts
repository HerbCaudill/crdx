import { Base58, Hash, hash } from '@herbcaudill/crypto'
import { HashPurpose } from '/constants'

const { LINK_HASH } = HashPurpose

export const hashEncryptedLink = (body: Base58) => {
  return hash(LINK_HASH, body) as Hash
}
