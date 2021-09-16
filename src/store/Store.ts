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
    if (this.isDispatching) throw new Error(`Can't call store.getState() while the reducer is executing. `)
    return this.state
  }

  public getChain(): SignatureChain<A, C> {
    return this.chain
  }

  public dispatch(action: Optional<A, 'payload'>) {
    if (this.isDispatching) throw new Error('Reducers may not dispatch actions.')

    // equip the action with an empty payload if it doesn't have one
    const actionWithPayload = { payload: undefined, ...action } as A

    this.isDispatching = true

    // append this action as a new link to the chain
    this.chain = append({ chain: this.chain, action: actionWithPayload, user: this.user, context: this.context })

    // get the newly appended link
    const head = getHead(this.chain) as ActionLink<A, C>

    // we don't need to pass the whole chain through the reducer, just the current state + the new head
    this.state = this.reducer(this.state, head)

    this.isDispatching = false
    this.emit('updated', { head: this.chain.head })

    return this
  }

  public merge(theirChain: SignatureChain<A, C>) {
    this.chain = merge(this.chain, theirChain)
    this.updateState()
    return this
  }

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
  private isDispatching = false

  private updateState() {
    const { chain, resolver, reducer } = this

    // Validate the chain's integrity.
    this.validate()

    // Use the filter & sequencer to turn the graph into an ordered sequence
    const sequence = getSequence<A, C>({ chain, resolver })

    // Run the sequence through the reducer to calculate the current team state
    this.state = sequence.reduce(reducer, this.initialState)

    this.emit('updated', { head: chain.head })
  }
}
