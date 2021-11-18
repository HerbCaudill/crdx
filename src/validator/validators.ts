import { signatures } from '@herbcaudill/crypto'
import { ValidationError, ValidatorSet } from './types'
import { getRoot } from '/chain/chain'
import { hashLink } from '/chain/hashLink'
import { ROOT, VALID } from '/constants'
import { memoize } from '/util'

const _validators: ValidatorSet = {
  /** Do the previous link(s) referenced by this link exist?  */
  validatePrev: (link, chain) => {
    for (const hash of link.body.prev)
      if (!(hash in chain.links))
        return fail(`The link referenced by one of the hashes in the \`prev\` property does not exist.`)

    return VALID
  },

  /** Does this link's hash check out? */
  validateHash: (link, chain) => {
    const { hash, body } = link
    const expected = hashLink(body)
    if (hash === expected) return VALID
    else return fail(`The hash calculated for this link does not match.`, { link, hash, expected })
  },

  /** If this is a root link, it should not have any predecessors, and should be the chain's root */
  validateRoot: (link, chain) => {
    const hasNoPrevLink = link.body.prev.length === 0
    const hasRootType = 'type' in link.body && link.body.type === ROOT
    const isTheChainRoot = getRoot(chain) === link
    // all should be true, or all should be false
    if (hasNoPrevLink === isTheChainRoot && isTheChainRoot === hasRootType) return VALID

    const message = hasRootType
      ? // ROOT
        hasNoPrevLink
        ? `The ROOT link cannot have any predecessors` // ROOT but has prev link
        : `The ROOT link has to be the link referenced by the chain \`root\` property` // ROOT but isn't chain root
      : // not ROOT
      hasNoPrevLink
      ? `Non-ROOT links must have predecessors` // not ROOT but has no prev link
      : `The link referenced by the chain \`root\` property must be a ROOT link` // not ROOT but is the chain root
    return fail(message, { link, chain })
  },

  /** Does this link's signature check out? */
  validateSignatures: (link) => {
    const signedMessage = {
      payload: link.body,
      signature: link.signed.signature,
      publicKey: link.signed.key,
    }
    return signatures.verify(signedMessage) //
      ? VALID
      : fail('Signature is not valid', signedMessage)
  },
}

const fail = (msg: string, args?: any) => ({ isValid: false, error: new ValidationError(msg, args) })

const memoizeFunctionMap = (source: ValidatorSet) => {
  const result = {} as ValidatorSet
  for (const key in source) result[key] = memoize(source[key])
  return result
}

export const validators = memoizeFunctionMap(_validators)
