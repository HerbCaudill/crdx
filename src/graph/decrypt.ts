import { asymmetric } from '@herbcaudill/crypto'
import { hashLink } from './hashLink'
import { Action, EncryptedGraph, EncryptedLink, Graph, Link, LinkBody, LinkMap } from './types'
import { Keyring, KeysetWithSecrets } from '/keyset'
import { createKeyring } from '/keyset/createKeyring'
import { assert, Hash } from '/util'

/**
 * Decrypts a single link of a graph, given the graph keys at the time the link was authored.
 */
export const decryptLink = <A extends Action, C>(
  encryptedLink: EncryptedLink,
  keys: Keyring | KeysetWithSecrets | KeysetWithSecrets[]
): Link<A, C> => {
  const { senderPublicKey: authorPublicKey, recipientPublicKey, encryptedBody } = encryptedLink

  const keyring = createKeyring(keys)
  const keyset = keyring[recipientPublicKey]
  assert(keyset, `Can't decrypt link: don't have the correct keyset`)

  var decryptedLinkBody = asymmetric.decrypt({
    cipher: encryptedBody,
    recipientSecretKey: keyset.encryption.secretKey,
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
 * Decrypts a graph using a one or more keys.
 */
export const decryptGraph = <A extends Action, C>({
  encryptedGraph,
  keys,
}: {
  encryptedGraph: Graph<A, C> | EncryptedGraph
  keys: KeysetWithSecrets | KeysetWithSecrets[] | Keyring
}): Graph<A, C> => {
  const { encryptedLinks, root, childMap = {} } = encryptedGraph

  const links = 'links' in encryptedGraph ? encryptedGraph.links : {}

  /** Recursively decrypts a link and its children. */
  const decrypt = (hash: Hash, prevLinks: Record<Hash, Link<A, C>> = {}): Record<Hash, Link<A, C>> => {
    // decrypt this link
    const encryptedLink = encryptedLinks[hash]!
    const decryptedLink =
      links[hash] ?? // if it's already decrypted, don't bother decrypting it again
      decryptLink(encryptedLink, keys)
    var newLinks = {
      [hash]: decryptedLink,
    }

    // decrypt its children
    const children = childMap[hash] ?? []
    children.forEach(hash => {
      newLinks = { ...newLinks, ...decrypt(hash, newLinks) }
    })

    return { ...prevLinks, ...newLinks }
  }

  const decryptedLinks = decrypt(root)

  return {
    ...encryptedGraph,
    links: decryptedLinks,
  }
}
