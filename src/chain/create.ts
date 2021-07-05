import { append } from '@/chain/append'
import { Action, ROOT, SignatureChain } from '@/chain/types'
import { UserWithSecrets } from '@/user'

export const EMPTY_CHAIN = {
  root: undefined,
  head: undefined,
  links: {},
}

export const create = <A extends Action>(payload: any = {}, user: UserWithSecrets) => {
  const link = { type: ROOT, payload }
  return append(EMPTY_CHAIN, link, user) as SignatureChain<A>
}
