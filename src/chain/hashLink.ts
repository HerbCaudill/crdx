import { initCrypto } from '@herbcaudill/crypto'
import { HashPurpose } from '/constants'

const { LINK_TO_PREVIOUS } = HashPurpose

export const hashLink = async (body: any) => {
  const { hash } = await initCrypto()
  return hash(LINK_TO_PREVIOUS, body)
}
