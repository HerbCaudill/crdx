import { asymmetric } from '@herbcaudill/crypto'
import { EMPTY_GRAPH } from './createGraph'
import { hashLink } from './hashLink'
import { Action, EncryptedLink, HashGraph, Link, LinkBody } from './types'
import { KeysetWithSecrets } from '/keyset'
import { UserWithSecrets } from '/user'

interface AppendParams<A extends Action, C> {
  /** The graph to append a link to. */
  graph: HashGraph<A, C> | typeof EMPTY_GRAPH

  /** The action (type & payload) being added to the graph. */
  action: A

  /** User object for the author of this link. */
  user: UserWithSecrets

  /** Any additional context provided by the application. */
  context?: C

  /** Keyset used to encrypt & decrypt the graph. */
  graphKeys: KeysetWithSecrets
}

export const append = <A extends Action, C>({
  graph,
  action,
  user,
  context = {} as C,
  graphKeys,
}: AppendParams<A, C>): HashGraph<A, C> => {
  // create (unencrypted) body

  const body = {
    ...action,
    userId: user.userId,
    timestamp: new Date().getTime(),
    ...context,
  } as LinkBody<A, C>

  // link to previous head(s). If there are no previous heads, this is the root node.
  body.prev = graph.head ?? []

  // create encrypted body

  const encryptedBody = asymmetric.encrypt({
    secret: body,
    recipientPublicKey: graphKeys.encryption.publicKey,
    senderSecretKey: user.keys.encryption.secretKey,
  })

  // the link's hash is calculated over the encrypted body
  const hash = hashLink(encryptedBody)

  // add (unencrypted) link

  const link: Link<A, C> = { body, hash }
  const links = { ...graph.links, [hash]: link }

  // add encrypted link

  const authorPublicKey = user.keys.encryption.publicKey
  const encryptedLink: EncryptedLink = { authorPublicKey, encryptedBody }
  const encryptedLinks = { ...graph.encryptedLinks, [hash]: encryptedLink }

  // return new graph

  const root = graph.root ?? hash // if the graph didn't already have a root, this is it
  const head = [hash]
  return { root, head, encryptedLinks, links } as HashGraph<A, C>
}
