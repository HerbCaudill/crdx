import { Action, Link, SignatureChain } from '@/chain'

export interface InvalidResult {
  isValid: false
  error: ValidationError
}

export interface ValidResult {
  isValid: true
}

export class ValidationError extends Error {
  constructor(message: string, details?: any) {
    super()
    this.message = message
    this.details = details
  }

  public name: 'Signature chain validation error'
  public details?: any
}

export type ValidationResult = ValidResult | InvalidResult

export type Validator = <A extends Action>(currentLink: Link<A>, chain: SignatureChain<A>) => ValidationResult

export type ValidatorSet = {
  [key: string]: Validator
}
