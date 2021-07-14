import { ValidationResult } from '@/util/types'

export enum HashPurpose {
  SIGNATURE = 'SIGNATURE',
  ENCRYPTION = 'ENCRYPTION',
  SYMMETRIC = 'SYMMETRIC',
  LINK_TO_PREVIOUS = 'LINK_TO_PREVIOUS',
}

export const VALID = { isValid: true } as ValidationResult
