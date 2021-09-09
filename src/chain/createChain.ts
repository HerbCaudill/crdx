import { ROOT } from '/constants'
import { UserWithSecrets } from '/user'
import cuid from 'cuid'
import { append } from './append'
import { Action, SignatureChain } from './types'

export const EMPTY_CHAIN = {
  root: undefined,
  head: undefined,
  links: {},
}

export const createChain = <A extends Action, C = {}>({
  user,
  id = cuid(),
  name = id,
  rootPayload = {},
  context = {} as C,
}: {
  /** Local user (with secret keys) that is creating the chain.  */
  user: UserWithSecrets

  /** Unique identifier for the chain. If none is provided, a random one will be generated. */
  id?: string

  /** Human facing name of the chain (e.g. document name, team name, etc). If none is provided, the `id` will be used. */
  name?: string

  /** Object containing information to be added to the ROOT link. */
  rootPayload?: any

  context?: C
}) => {
  const link = {
    type: ROOT,
    payload: {
      name,
      id,
      ...rootPayload, // the root payload may override name or id
    },
  }
  return append({ chain: EMPTY_CHAIN, action: link, user, context }) as SignatureChain<A, C>
}
