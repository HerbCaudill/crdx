import { asymmetric } from '@herbcaudill/crypto'
import { hashLink } from './hashLink'
import { Action, EncryptedLink, Link, LinkBody, HashGraph } from './types'
import { KeysetWithSecrets } from '/keyset'

/**
 * Decrypts a single link of a chain, given the chain keys at the time the link was authored.
 */
export const decryptLink = <A extends Action, C>(
  encryptedLink: EncryptedLink,
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

/**
 * Decrypts a chain using a single keyset.
 *
 * **Note:** Applications that encode key rotations on the chain (like lf/auth) will need to
 * implement their own version of `decryptChain` that reduces as it goes along, so that it can
 * determine the correct keyset to use for each link.  */
export const decryptChain = <A extends Action, C>(
  chain: HashGraph<A, C>,
  chainKeys: KeysetWithSecrets
): HashGraph<A, C> => {
  const { encryptedLinks, links = {} } = chain
  const decryptedLinks = {} as Record<string, Link<A, C>>

  for (const hash in encryptedLinks) {
    if (!(hash in links)) {
      const link = decryptLink<A, C>(encryptedLinks[hash], chainKeys)
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
