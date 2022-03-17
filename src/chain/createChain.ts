import cuid from 'cuid'
import { append } from './append'
import { Action, HashGraph } from './types'
import { ROOT } from '/constants'
import { KeysetWithSecrets } from '/keyset'
import { UserWithSecrets } from '/user'

export const EMPTY_CHAIN = {
  root: undefined,
  head: undefined,
  encryptedLinks: {},
  links: {},
}

interface CreateChainParams<C = {}> {
  /** Local user (with secret keys) that is creating the chain.  */
  user: UserWithSecrets

  /** Unique identifier for the chain. If none is provided, a random one will be generated. */
  id?: string

  /** Human facing name of the chain (e.g. document name, team name, etc). This should be unique
   * within the application's namespace. If none is provided, the `id` will be used. */
  name?: string

  /** Object containing information to be added to the ROOT link. */
  rootPayload?: any

  /** Any additional context provided by the application. */
  context?: C

  /** Keyset used to encrypt & decrypt the chain. */
  chainKeys: KeysetWithSecrets
}

export const createChain = <A extends Action, C = {}>({
  user,
  id = cuid(),
  name = id,
  rootPayload = {},
  context = {} as C,
  chainKeys,
}: CreateChainParams<C>) => {
  const rootAction = {
    type: ROOT,
    prev: [],
    payload: {
      name,
      id,
      ...rootPayload, // the root payload may override name or id
    },
  } as Action
  const chain = append({
    chain: EMPTY_CHAIN,
    action: rootAction,
    user,
    context,
    chainKeys,
  })
  return chain as HashGraph<A, C>
}
