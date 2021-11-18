import { hash } from '@herbcaudill/crypto'
import { Action } from './types'
import { HashPurpose } from '/constants'

const { LINK_TO_PREVIOUS } = HashPurpose

export const hashLink = <A extends Action>(body: A) => {
  return hash(LINK_TO_PREVIOUS, body)
}
