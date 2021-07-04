import { EMPTY_CHAIN } from '@/chain/create'
import { hashLink } from '@/chain/hashLink'
import { Action, NonRootLinkBody, SignatureChain, SignedLink } from '@/chain/types'
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
    prev: chain.head,
  } as NonRootLinkBody<A>

  const { userName, keys } = user
  const hash = hashLink(body)

  // attach signature
  const signedLink: SignedLink<NonRootLinkBody<A>, A> = {
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
  const root = chain.root ?? hash // if the root is null, this was the first link
  const head = hash
  return { root, head, links } as SignatureChain<A>
}
