export enum HashPurpose {
  SIGNATURE = 'SIGNATURE',
  ENCRYPTION = 'ENCRYPTION',
  SYMMETRIC = 'SYMMETRIC',
  LINK_TO_PREVIOUS = 'LINK_TO_PREVIOUS',
}

export const ROOT = 'ROOT'
export const MERGE = 'MERGE'

import { ValidationResult } from './validator/types'

export const VALID = { isValid: true } as ValidationResult
