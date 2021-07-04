import { append } from '@/chain/append'
import { Action, ROOT, SignatureChain } from '@/chain/types'
import { User } from '@/user'

export const EMPTY_CHAIN = {
  root: null,
  head: null,
  links: {},
}

export const create = <A extends Action>(payload: any = {}, user: User) => {
  const link = { type: ROOT, payload }
  return append(EMPTY_CHAIN, link, user) as SignatureChain<A>
}
