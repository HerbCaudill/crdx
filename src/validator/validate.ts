import { ValidationResult, ValidatorSet } from './types'
import { fail, validators } from './validators'
import { hashLink } from '/chain/hashLink'
import { Action, Link, SignatureChain } from '/chain/types'
import { VALID } from '/constants'

/**
 * Runs a signature chain through a series of validators to ensure that it is correctly formed, has
 * not been tampered with, etc.
 */
export const validate = <A extends Action, C>(
  /** The signature chain to validate. */
  chain: SignatureChain<A, C>,

  /** Any additional validators (besides the base validators that test the chain's integrity) */
  customValidators: ValidatorSet = {}
): ValidationResult => {
  // Confirm that the root hash matches the computed hash of the root link
  {
    const rootHash = chain.root
    const rootLink = chain.encryptedLinks[rootHash]
    const computedHash = hashLink(rootLink.encryptedBody)
    if (computedHash !== rootHash)
      return fail('Root hash does not match the hash of the root link', { rootHash, computedHash, rootLink })
  }
  // Confirm that each head hash matches the computed hash of the head link
  for (const headHash of chain.head) {
    const headLink = chain.encryptedLinks[headHash]
    const computedHash = hashLink(headLink.encryptedBody)
    if (computedHash !== headHash)
      return fail('Head hash does not match the hash of the head link', { headHash, computedHash, headLink })
  }

  // Returns a single reducer function that runs all validators.
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
          return fail(e.message, e)
        }
      }
      return VALID
    }

  const compositeValidator = composeValidators(validators, customValidators)
  for (const link of Object.values(chain.links)) {
    const result = compositeValidator(link)
    if (!result.isValid) return result
  }

  return VALID
}

// merges multiple validator sets into one object
const merge = (validatorSets: ValidatorSet[]) => validatorSets.reduce((result, vs) => Object.assign(result, vs), {})
