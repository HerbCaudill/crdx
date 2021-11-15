import { hash } from '@herbcaudill/crypto'
import { HashPurpose } from '/constants'

const { LINK_TO_PREVIOUS } = HashPurpose

export const hashLink = (body: any) => {
  return hash(LINK_TO_PREVIOUS, body)
}
