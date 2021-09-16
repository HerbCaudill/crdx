import EventEmitter from 'events'
import { Reducer } from './types'
import {
  Action,
  ActionLink,
  append,
  baseResolver,
  createChain,
  deserialize,
  getHead,
  getSequence,
  merge,
  Resolver,
  serialize,
  SignatureChain,
} from '/chain'
import { UserWithSecrets } from '/user'
import { Optional } from '/util'
import { validate, ValidatorSet } from '/validator'
import { CreateStoreOptions } from './createStore'

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
  }: CreateStoreOptions<S, A, C>) {
    super()

    this.chain = !chain
      ? // no chain provided, create one
        createChain({ user, rootPayload })
      : typeof chain === 'string'
      ? // serialized chain provided, deserialize it
        deserialize(chain)
      : // chain provided, use it
        chain

    this.context = context
    this.initialState = initialState
    this.reducer = reducer
    this.validators = validators
    this.resolver = resolver
    this.user = user

    // set the initial state
    this.updateState()
  }

  public getState(): S {
    return this.state
  }

  public getChain(): SignatureChain<A, C> {
    return this.chain
  }

  /** Dispatches an action to be added to the signature chain. This is the only way to trigger a
   *  state change.
   *
   *  The `reducer` function provided when creating the store will be called with the current state
   *  and the given `action`. Its return value will be considered the **next** state of the tree,
   *  and any change listeners will be notified.
   *
   *  @param action A plain object representing what changed. It is a good idea to keep actions
   *  serializable so you can record and replay user sessions. An action must have a `type` property
   *  which may not be `undefined`. It is a good idea to use string constants for action types.
   *
   *  @returns For convenience, the same action object you dispatched.
   */
  public dispatch(action: Optional<A, 'payload'>) {
    // equip the action with an empty payload if it doesn't have one
    const actionWithPayload = { payload: undefined, ...action } as A

    // append this action as a new link to the chain
    this.chain = append({ chain: this.chain, action: actionWithPayload, user: this.user, context: this.context })

    // get the newly appended link
    const head = getHead(this.chain) as ActionLink<A, C>

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
  public merge(theirChain: SignatureChain<A, C>) {
    this.chain = merge(this.chain, theirChain)
    this.updateState()
    return this
  }

  /** Returns a serialized chain that can be used to rehydrate this store from storage. */
  public save() {
    return serialize(this.chain)
  }

  public validate() {
    const validationResult = validate(this.chain, this.validators)
    if (validationResult.isValid === false) {
      throw validationResult.error
    }
  }

  // PRIVATE
  private user: UserWithSecrets
  private context: C
  private chain: SignatureChain<A, C>
  private initialState: S
  private reducer: Reducer<S, A, C>
  private resolver: Resolver<A, C>
  private validators?: ValidatorSet

  private state: S

  private updateState() {
    const { chain, resolver, reducer } = this

    // Validate the chain's integrity.
    this.validate()

    // Use the filter & sequencer to turn the graph into an ordered sequence
    const sequence = getSequence<A, C>({ chain, resolver })

    // Run the sequence through the reducer to calculate the current team state
    this.state = sequence.reduce(reducer, this.initialState)

    // notify listeners
    this.emit('updated', { head: chain.head })
  }
}
