import { Base58, hash } from '@herbcaudill/crypto'
import { HashPurpose } from '/constants'

const { LINK_HASH } = HashPurpose

export const hashEncryptedLink = (body: Base58) => {
  return hash(LINK_HASH, body)
}
