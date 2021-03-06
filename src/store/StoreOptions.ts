import { Reducer } from './types'
import { Action, Resolver, SignatureChain } from '/chain'
import { UserWithSecrets } from '/user'
import { ValidatorSet } from '/validator'

export type StoreOptions<S, A extends Action, C> = {
  /** The user local user, along with their secret keys for signing, encrypting, etc.  */
  user: UserWithSecrets

  /** Additional context information to be added to each link (e.g. device, client, etc.) */
  context?: C

  /** A Redux-style reducer that calculates a new state given the previous state and an action. In
   *  this case an "action" is a link in a signature chain. */
  reducer: Reducer<S, A, C>

  /** A resolver defines how any two concurrent sequences will be merged. It is a pure function that is
   *  given two concurrent branches and returns a single branch. This is where you implement any
   *  domain-specific conflict-resolution logic. */
  resolver?: Resolver<A, C>

  /** Optional validators to ensure the chain is in a valid state. These are used in addition to
   *  built-in validators, for example those that that validate cryptographic hashes and signatures. */
  validators?: ValidatorSet

  /** The initial state to provide to the reducer's first action. By default this is an empty object `{}`*/
  initialState?: S

  /** For pre-existing stores: A chain to preload, e.g. from saved state. */
  chain?: string | SignatureChain<A, C>

  /** For new stores: Additional information to include in the root node  */
  rootPayload?: any
}
