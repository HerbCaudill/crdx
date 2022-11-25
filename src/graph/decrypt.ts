import { asymmetric } from '@herbcaudill/crypto'
import { hashLink } from './hashLink'
import { Action, EncryptedGraph, EncryptedLink, Graph, Link, LinkBody, LinkMap } from './types'
import { Keyring, KeysetWithSecrets } from '/keyset'

/**
 * Decrypts a single link of a graph, given the graph keys at the time the link was authored.
 */
export const decryptLink = <A extends Action, C>(encryptedLink: EncryptedLink, keys: KeysetWithSecrets): Link<A, C> => {
  const { senderPublicKey: authorPublicKey, encryptedBody } = encryptedLink
  var decryptedLinkBody = asymmetric.decrypt({
    cipher: encryptedBody,
    recipientSecretKey: keys.encryption.secretKey,
    senderPublicKey: authorPublicKey,
  }) as LinkBody<A, C>

  // HACK figure out why we'd be getting a JSON string here
  if (typeof decryptedLinkBody === 'string') decryptedLinkBody = JSON.parse(decryptedLinkBody)
  // if (typeof decryptedLinkBody === 'string') console.error({ decryptedLinkBody })

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
export const decryptGraph = <A extends Action, C>({
  encryptedGraph,
  keys,
  childMap,
}: {
  encryptedGraph: Graph<A, C> | EncryptedGraph
  keys: KeysetWithSecrets | KeysetWithSecrets[] | Keyring
}): Graph<A, C> => {
  const { encryptedLinks, root, childMap = {} } = encryptedGraph

  /** Recursively decrypts a link and its children. */
  const decrypt = (
    hash: Hash,
    prevKeys: KeysetWithSecrets,
    prevDecryptedLinks: Record<Hash, Link<A, C>> = {}
  ): Record<Hash, Link<A, C>> => {
    // decrypt this link
    const encryptedLink = encryptedLinks[hash]!
    const decryptedLink = decryptLink<A, C>(encryptedLink, prevKeys)
    var decryptedLinks = {
      [hash]: decryptedLink,
    }

    // // reduce & get new team keys
    // const newState = reducer(prevState, decryptedLink)
    // const newKeys = keys(newState, deviceKeys, TEAM_SCOPE)

    // decrypt its children
    const children = childMap[hash]

    if (children) {
      children.forEach(hash => {
        decryptedLinks = { ...decryptedLinks, ...decrypt(hash, keys, decryptedLinks) }
      })
    }

    return { ...prevDecryptedLinks, ...decryptedLinks }
  }

  const decryptedLinks = decrypt(root, keys)

  return {
    ...encryptedGraph,
    links: decryptedLinks,
  }
}
