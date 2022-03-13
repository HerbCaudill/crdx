import { asymmetric } from '@herbcaudill/crypto'
import { hashLink } from './hashLink'
import { Action, EncryptedLink, Link, LinkBody, SignatureChain } from './types'
import { KeysetWithSecrets } from '/keyset'

export const decryptLink = <A extends Action, C>(
  encryptedLink: EncryptedLink<A, C>,
  chainKeys: KeysetWithSecrets
): Link<A, C> => {
  const { authorPublicKey, encryptedBody } = encryptedLink
  const decryptedLinkBody = asymmetric.decrypt({
    cipher: encryptedBody,
    recipientSecretKey: chainKeys.encryption.secretKey,
    senderPublicKey: authorPublicKey,
  })

  return {
    hash: hashLink(encryptedBody),
    body: JSON.parse(decryptedLinkBody) as LinkBody<A, C>,
  }
}

export const decryptChain = <A extends Action, C>(
  chain: SignatureChain<A, C>,
  chainKeys: KeysetWithSecrets
): SignatureChain<A, C> => {
  const { encryptedLinks, links } = chain
  const decryptedLinks = {} as Record<string, Link<A, C>>

  // TODO: for now we're just using the chain keys we're given to do this without looking
  // processing the chain, but this will break if keys are rotated. we actually need to reduce as
  // we go along to keep up with any changes in keys.

  for (const hash in encryptedLinks) {
    if (!(hash in links)) {
      const link = decryptLink(encryptedLinks[hash], chainKeys)
      decryptedLinks[hash] = link
    }
  }

  return {
    ...chain,
    links: {
      ...links,
      ...decryptedLinks,
    },
  }
}
