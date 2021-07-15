import { getRoot } from '@/chain/getRoot'
import { hashLink } from '@/chain/hashLink'
import { isActionLink, isMergeLink, isRootLink } from '@/chain/types'
import { ROOT, VALID } from '@/constants'
import { memoize } from '@/util'
import { signatures } from '@herbcaudill/crypto'
import { ValidationError, ValidatorSet } from './types'

const _validators: ValidatorSet = {
  /** Does the previous link referenced by this link exist?  */
  validatePrev: (link, chain) => {
    if (isRootLink(link)) return VALID // nothing to validate on first link
    const prevHashes = isActionLink(link) ? [link.body.prev] : link.body
    for (const hash of prevHashes) {
      const prevLink = chain.links[hash]
      if (prevLink === undefined)
        return fail(`The link referenced by the hash in the \`prev\` property does not exist.`)
    }
    return VALID
  },

  /** Does this link's hash check out? */
  validateHash: (link, chain) => {
    const { hash, body } = link
    const expected = hashLink(body)
    if (hash === expected) return VALID
    else {
      return fail(`The hash calculated for this link does not match.`, { link, hash, expected })
    }
  },

  /** If this is a root link, it should not have any predecessors, and should be the chain's root */
  validateRoot: (link, chain) => {
    if (isMergeLink(link)) return VALID
    const hasNoPrevLink = !('prev' in link.body) || (link.body as any).prev === undefined
    const hasRootType = 'type' in link.body && link.body.type === ROOT
    const isTheChainRoot = getRoot(chain) === link
    // all should be true, or all should be false
    if (hasNoPrevLink === isTheChainRoot && isTheChainRoot === hasRootType) {
      return VALID
    } else {
      const message = hasRootType
        ? // ROOT
          hasNoPrevLink
          ? `The ROOT link cannot have a predecessor (\`prev\` property)` // ROOT but has prev link
          : `The ROOT link has to be the link referenced by the chain \`root\` property` // ROOT but isn't chain root
        : // not ROOT
        hasNoPrevLink
        ? `Non-ROOT links must have a predecessor (\`prev\` property)` // not ROOT but has no prev link
        : `The link referenced by the chain \`root\` property must be a ROOT link` // not ROOT but is the chain root
      return fail(message, { link, chain })
    }
  },

  /** Does this link's signature check out? */
  validateSignatures: link => {
    if (isMergeLink(link)) return VALID // merge links aren't signed

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
