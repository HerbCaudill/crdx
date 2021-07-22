import { KeyScope } from './keyset'
import { ValidationResult } from './validator/types'

export enum HashPurpose {
  SIGNATURE = 'SIGNATURE',
  ENCRYPTION = 'ENCRYPTION',
  SYMMETRIC = 'SYMMETRIC',
  LINK_TO_PREVIOUS = 'LINK_TO_PREVIOUS',
}

export const ROOT = 'ROOT'
export const MERGE = 'MERGE'
export const VALID = { isValid: true } as ValidationResult

export const EPHEMERAL_SCOPE: KeyScope = { type: 'EPHEMERAL', name: 'EPHEMERAL' }
