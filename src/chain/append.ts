import { EMPTY_CHAIN } from '@/chain/createChain'
import { hashLink } from '@/chain/hashLink'
import { Action, Link, LinkBody, SignatureChain } from '@/chain/types'
import { redactUser, UserWithSecrets } from '@/user'
import { signatures } from '@herbcaudill/crypto'

export const append = <A extends Action>(
  chain: SignatureChain<A> | typeof EMPTY_CHAIN,
  action: A,
  user: UserWithSecrets
): SignatureChain<A> => {
  // chain to previous head
  const body = {
    ...action,
    user: redactUser(user),
    timestamp: new Date().getTime(),
    ...(chain.head ? { prev: chain.head } : {}),
  } as LinkBody<A>

  // if ('head' in chain) body.prev = chain.head

  const { userName, keys } = user
  const hash = hashLink(body)

  // attach signature
  const signedLink: Link<A> = {
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
  return { root, head, links } as SignatureChain<A>
}
