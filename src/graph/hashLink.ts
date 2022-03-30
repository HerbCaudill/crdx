import { Encrypted, hash } from '@herbcaudill/crypto'
import { Action, LinkBody } from './types'
import { HashPurpose } from '/constants'

const { LINK_HASH } = HashPurpose

export const hashLink = <A extends Action, C>(body: Encrypted<LinkBody<A, C>>) => {
  return hash(LINK_HASH, body)
}
