import { asymmetric } from '@herbcaudill/crypto'
import { hashLink } from './hashLink'
import { Action, EncryptedLink, Link, LinkBody, HashGraph, EncryptedHashGraph } from './types'
import { KeysetWithSecrets } from '/keyset'

/**
 * Decrypts a single link of a graph, given the graph keys at the time the link was authored.
 */
export const decryptLink = <A extends Action, C>(
  encryptedLink: EncryptedLink,
  graphKeys: KeysetWithSecrets
): Link<A, C> => {
  const { authorPublicKey, encryptedBody } = encryptedLink
  var decryptedLinkBody = asymmetric.decrypt({
    cipher: encryptedBody,
    recipientSecretKey: graphKeys.encryption.secretKey,
    senderPublicKey: authorPublicKey,
  }) as LinkBody<A, C>

  // HACK figure out why we'd be getting a string here
  if (typeof decryptedLinkBody === 'string') console.error({ decryptedLinkBody }) // decryptedLinkBody = JSON.parse(decryptedLinkBody) //

  return {
    hash: hashLink(encryptedBody),
    body: decryptedLinkBody,
  }
}

/**
 * Decrypts a graph using a single keyset.
 *
 * **Note:** Applications that encode key rotations on the graph (like lf/auth) will need to
 * implement their own version of `decryptGraph` that reduces as it goes along, so that it can
 * determine the correct keyset to use for each link.  */
export const decryptGraph = <A extends Action, C>(
  graph: EncryptedHashGraph | HashGraph<A, C>,
  graphKeys: KeysetWithSecrets
): HashGraph<A, C> => {
  const { encryptedLinks, links = {} } = graph as HashGraph<A, C>
  const decryptedLinks = {} as Record<string, Link<A, C>>

  for (const hash in encryptedLinks) {
    if (!(hash in links)) {
      const link = decryptLink<A, C>(encryptedLinks[hash], graphKeys)
      decryptedLinks[hash] = link
    }
  }

  return {
    ...graph,
    links: {
      ...links,
      ...decryptedLinks,
    },
  }
}
