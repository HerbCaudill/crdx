import { redactUser, UserWithSecrets } from '/user'
import { signatures, hash } from '@herbcaudill/crypto'
import { EMPTY_CHAIN } from './createChain'
import { hashLink } from './hashLink'
import { Action, LinkBody, SignatureChain, Link } from './types'

export const append = <A extends Action, C>({
  chain,
  action,
  user,
  context = {} as C,
}: {
  chain: SignatureChain<A, C> | typeof EMPTY_CHAIN
  action: A
  user: UserWithSecrets
  context?: C
}): SignatureChain<A, C> => {
  const body = {
    ...action,
    user: redactUser(user),
    timestamp: new Date().getTime(),
    ...context,
  } as LinkBody<A, C>

  // chain to previous head(s). if none exists, this is the root node.
  if (chain.head) body.prev = chain.head

  // attach the hash and signature to create a new link
  const hash = hashLink(body)
  const { userName, keys } = user
  const signed = {
    userName,
    signature: signatures.sign(body, keys.signature.secretKey),
    key: keys.signature.publicKey,
  }
  const link: Link<A, C> = { body, hash, signed }

  // clone the previous map of links and add the new one
  const links = { ...chain.links, [hash]: link }

  // TODO
  const encryptedLinks = chain.encryptedLinks

  // return new chain
  const root = chain.root ?? hash // if the chain didn't already have a root, this is it
  const head = [hash]
  return { root, head, encryptedLinks, links } as SignatureChain<A, C>
}
