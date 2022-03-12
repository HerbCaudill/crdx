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

    // TODO: remove signature block once it's not used
    signed: {
      signature: '',
      userName: '',
      key: '',
    },
  }
}

export const decryptChain = <A extends Action, C>(
  chain: SignatureChain<A, C>,
  chainKeys: KeysetWithSecrets
): SignatureChain<A, C> => {
  const { encryptedLinks, links } = chain
  const decryptedLinks = {} as Record<string, Link<A, C>>
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
