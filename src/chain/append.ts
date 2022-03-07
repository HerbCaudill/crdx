﻿import { asymmetric, signatures } from '@herbcaudill/crypto'
import { EMPTY_CHAIN } from './createChain'
import { hashLink } from './hashLink'
import { Action, EncryptedLink, Link, LinkBody, SignatureChain } from './types'
import { KeysetWithSecrets } from '/keyset'
import { redactUser, UserWithSecrets } from '/user'

interface AppendParams<A extends Action, C> {
  /** The chain to append a link to. */
  chain: SignatureChain<A, C> | typeof EMPTY_CHAIN

  /** The action (type & payload) being added to the chain. */
  action: A

  /** User object for the author of this link. */
  user: UserWithSecrets

  /** Any additional context provided by the application. */
  context?: C

  /** Keyset used to encrypt & decrypt the chain. */
  chainKeys: KeysetWithSecrets
}

export const append = <A extends Action, C>({
  chain,
  action,
  user,
  context = {} as C,
  chainKeys,
}: AppendParams<A, C>): SignatureChain<A, C> => {
  // unencrypted body
  const body = {
    ...action,
    user: redactUser(user),
    timestamp: new Date().getTime(),
    ...context,
  } as LinkBody<A, C>

  // chain to previous head(s). if none exists, this is the root node.
  if (chain.head) body.prev = chain.head

  // encrypted body

  const encryptedBody = asymmetric.encrypt({
    secret: body,
    recipientPublicKey: chainKeys.encryption.publicKey,
    senderSecretKey: user.keys.encryption.secretKey,
  })

  // the link's hash is calculated over the encrypted body
  const hash = hashLink(encryptedBody)

  // unencrypted link

  // TODO: the signature block will go away
  const { userName, keys } = user
  const signed = {
    userName,
    signature: signatures.sign(body, keys.signature.secretKey),
    key: keys.signature.publicKey,
  }

  const link: Link<A, C> = { body, hash, signed }
  const links = { ...chain.links, [hash]: link }

  // encrypted link

  const authorPublicKey = user.keys.encryption.publicKey
  const encryptedLink: EncryptedLink<A, C> = { authorPublicKey, encryptedBody }
  const encryptedLinks = { ...chain.encryptedLinks, [hash]: encryptedLink }

  // return new chain
  const root = chain.root ?? hash // if the chain didn't already have a root, this is it
  const head = [hash]
  return { root, head, encryptedLinks, links } as SignatureChain<A, C>
}
