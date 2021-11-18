import { getSequence } from '/chain/getSequence'
import { Action, Link, SignatureChain } from '/chain/types'
import { validators } from './validators'
import { InvalidResult, ValidatorSet, ValidationResult } from './types'
import { VALID } from '/constants'

/**
 * Runs a signature chain through a series of validators to ensure that it is correctly formed, has
 * not been tampered with, etc.
 * @chain The signature chain to validate
 * @customValidators Any additional validators (besides the base validators that test the chain's
 * integrity)
 */
export const validate = <A extends Action, C>(
  chain: SignatureChain<A, C>,
  customValidators: ValidatorSet = {}
): ValidationResult => {
  /**
   * Returns a single reducer function that runs all validators.
   * @param validators A map of validators
   */
  const composeValidators =
    (...validators: ValidatorSet[]) =>
    (currentLink: Link<A, C>) => {
      const mergedValidators = merge(validators)
      for (const key in mergedValidators) {
        const validator = mergedValidators[key]
        try {
          const result = validator(currentLink, chain)
          if (result.isValid === false) return result
        } catch (e) {
          // any errors thrown cause validation to fail and are returned with the validation result
          // ignore coverage
          return {
            isValid: false,
            error: { message: e.message, details: e },
          } as InvalidResult
        }
      }
      // no validators failed
      return VALID
    }

  const compositeValidator = composeValidators(validators, customValidators)

  for (const link of getSequence(chain)) {
    const result = compositeValidator(link)
    if (!result.isValid) return result
  }
  return VALID
}

export const assertIsValid = (chain: SignatureChain<any, any>) => {
  const validationResult = validate(chain)
  if (!validationResult.isValid) throw new Error(`Invalid chain: ${validationResult.error.message}`)
}

// merges multiple validator sets into one object
const merge = (validatorSets: ValidatorSet[]) => validatorSets.reduce((result, vs) => Object.assign(result, vs), {})
