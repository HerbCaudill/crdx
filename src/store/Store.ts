import EventEmitter from 'events'
import { StoreOptions } from './StoreOptions'
import { Reducer } from './types'
import {
  Action,
  baseResolver,
  append,
  createChain,
  deserialize,
  getHead,
  getSequence,
  merge,
  Resolver,
  serialize,
  HashGraph,
} from '/chain'
import { decryptChain } from '/chain/decrypt'
import { KeysetWithSecrets } from '/keyset'
import { UserWithSecrets } from '/user'
import { Optional } from '/util'
import { validate, ValidatorSet } from '/validator'

/**
 * A CRDX `Store` is intended to work very much like a Redux store.
 * https://github.com/reduxjs/redux/blob/master/src/createStore.ts
 *
 * The only way to change the data in the store is to `dispatch` an action to it. There should only
 * be a single store in an application.
 */
export class Store<S, A extends Action, C = {}> extends EventEmitter {
  constructor({
    user,
    context = {} as C,
    chain,
    rootPayload,
    initialState = {} as S,
    reducer,
    validators,
    resolver = baseResolver,
    chainKeys,
  }: StoreOptions<S, A, C>) {
    super()

    this.chain = !chain
      ? // no chain provided, create one
        createChain({ user, rootPayload, chainKeys })
      : typeof chain === 'string'
      ? // serialized chain provided, deserialize it
        decryptChain(deserialize(chain), chainKeys)
      : // chain provided, use it
        chain

    this.context = context
    this.initialState = initialState
    this.reducer = reducer
    this.validators = validators
    this.resolver = resolver
    this.user = user
    this.chainKeys = chainKeys

    // set the initial state
    this.updateState()
  }

  /** Returns the store's most recent state. */
  public getState(): S {
    return this.state
  }

  /** Returns the current hash graph */
  public getChain(): HashGraph<A, C> {
    return this.chain
  }

  /** Returns a the current hash graph in serialized form; this can be used to rehydrate this
   * store from storage. */
  public save() {
    // remove plaintext  links from chain
    const { links, ...redactedChain } = this.chain

    return serialize(redactedChain as HashGraph<A, C>)
  }

  /**
   * Dispatches an action to be added to the hash graph. This is the only way to trigger a
   * state change.
   *
   * The `reducer` function provided when creating the store will be called with the current state
   * and the given `action`. Its return value will be considered the **next** state of the tree,
   * and any change listeners will be notified.
   *
   * @param action A plain object representing what changed. It is a good idea to keep actions
   * serializable so you can record and replay user sessions. An action must have a `type` property
   * which may not be `undefined`. It is a good idea to use string constants for action types.
   *
   * @returns For convenience, the same action object you dispatched.
   */
  public dispatch(action: Optional<A, 'payload'>) {
    // equip the action with an empty payload if it doesn't have one
    const actionWithPayload = { payload: undefined, ...action } as A

    // append this action as a new link to the chain
    this.chain = append({
      chain: this.chain,
      action: actionWithPayload,
      user: this.user,
      chainKeys: this.chainKeys,
    })

    // get the newly appended link (at this point we're guaranteed a single head, which is the one we appended)
    const [head] = getHead(this.chain)

    // we don't need to pass the whole chain through the reducer, just the current state + the new head
    this.state = this.reducer(this.state, head)

    // notify listeners
    this.emit('updated', { head: this.chain.head })

    return action
  }

  /**
   * Merges another chain (e.g. from a peer) with ours.
   * @param theirChain
   * @returns this `Store` instance
   */
  public merge(theirChain: HashGraph<A, C>) {
    this.chain = merge(this.chain, theirChain)
    this.updateState()
    return this
  }

  /**
   * Validates the store's integrity, using the built-in validators (which check, among other
   * things, the crypto hashes and signatures) as well as any validators provided by the
   * application.
   */
  public validate() {
    return validate(this.chain, this.validators)
  }

  // PRIVATE

  /** The user object provided in options */
  private user: UserWithSecrets

  /** The context object provided in options */
  private context: C

  /** The inital state provided in options */
  private initialState: S

  /** The reducer function provided in the constructor */
  private reducer: Reducer<S, A, C>
  private resolver: Resolver<A, C>
  private validators?: ValidatorSet

  private chainKeys: KeysetWithSecrets

  private chain: HashGraph<A, C>
  private state: S

  private updateState() {
    const { chain, resolver, reducer } = this

    // Validate the chain's integrity.
    this.validate()

    // Use the filter & sequencer to turn the graph into an ordered sequence
    const sequence = getSequence<A, C>(chain, resolver)

    // Run the sequence through the reducer to calculate the current team state
    this.state = sequence.reduce(reducer, this.initialState)

    // notify listeners
    this.emit('updated', { head: chain.head })
  }
}
