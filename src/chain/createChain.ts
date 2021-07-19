import { append } from './append'
import { Action, RootLinkBody, SignatureChain } from './types'
import { ROOT } from '@/constants'
import { UserWithSecrets } from '@/user'
import { Optional } from '@/util'
import cuid from 'cuid'

export const EMPTY_CHAIN = {
  root: undefined,
  head: undefined,
  links: {},
}

export const createChain = <A extends Action>(
  { name, id = cuid() }: Optional<RootLinkBody['payload'], 'id'>,
  user: UserWithSecrets
) => {
  const link = { type: ROOT, payload: { name, id } }
  return append(EMPTY_CHAIN, link, user) as SignatureChain<A>
}
