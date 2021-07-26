import { redactUser, UserWithSecrets } from '/user'
import { signatures } from '@herbcaudill/crypto'
import { EMPTY_CHAIN } from './createChain'
import { hashLink } from './hashLink'
import { Action, LinkBody, SignatureChain, SignedLink } from './types'

export const append = <A extends Action, C>(
  chain: SignatureChain<A, C> | typeof EMPTY_CHAIN,
  action: A,
  user: UserWithSecrets,
  context: C = {} as C
): SignatureChain<A, C> => {
  // chain to previous head
  const body = {
    ...action,
    user: redactUser(user),
    timestamp: new Date().getTime(),
    ...context,
    ...(chain.head ? { prev: chain.head } : {}),
  } as LinkBody<A, C>

  // if ('head' in chain) body.prev = chain.head

  const { userName, keys } = user
  const hash = hashLink(body)

  // attach signature
  const signedLink: SignedLink<A, C> = {
    body,
    hash,
    signed: {
      userName,
      signature: signatures.sign(body, keys.signature.secretKey),
      key: keys.signature.publicKey,
    },
  }

  // clone the previous map of links and add the new one
  const links = { ...chain.links, [hash]: signedLink }

  // return new chain
  const root = chain.root ?? hash // if no root was given, this was the first link
  const head = hash
  return { root, head, links } as SignatureChain<A, C>
}
