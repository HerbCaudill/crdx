import {
  Action,
  ActionLink,
  append,
  createChain,
  deserialize,
  getHead,
  getSequence,
  merge,
  Resolver,
  Sequencer,
  serialize,
  SignatureChain,
} from '/chain'
import { UserWithSecrets } from '/user'
import { Optional } from '/util'
import { validate, ValidatorSet } from '/validator'
import EventEmitter from 'events'
import { Reducer } from './types'

export class Store<S, A extends Action, C = {}> extends EventEmitter {
  constructor({
    user,
    context = {} as C,
    chain,
    rootPayload,
    initialState = {} as S,
    reducer,
    validators,
    resolver,
    sequencer,
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
    this.sequencer = sequencer
    this.user = user

    // set the initial state
    this.updateState()
  }

  public getState(): S {
    if (this.isDispatching)
      throw new Error(
        'You may not call store.getState() while the reducer is executing. ' +
          'The reducer has already received the state as an argument. ' +
          'Pass it down from the top reducer instead of reading it from the store.'
      )

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
  private reducer: Reducer<S, A>
  private sequencer?: Sequencer<A, C>
  private resolver?: Resolver<A, C>

  private validators?: ValidatorSet

  private state: S
  private isDispatching = false

  private updateState() {
    const { chain, resolver, sequencer, reducer } = this

    // Validate the chain's integrity.
    this.validate()

    // Use the resolver & sequencer to turn the graph into an ordered sequence
    const sequence = getSequence<A, C>({ chain, resolver, sequencer })

    // Run the sequence through the reducer to calculate the current team state
    this.state = sequence.reduce(reducer, this.initialState)

    this.emit('updated', { head: chain.head })
  }
}

export const createStore = <S, A extends Action, C>(options: CreateStoreOptions<S, A, C>) => {
  return new Store(options)
}

export type CreateStoreOptions<S, A extends Action, C> = {
  /** The user local user, along with their secret keys for signing, encrypting, etc.  */
  user: UserWithSecrets

  /** Additional context information to be added to each link (e.g. device, client, etc.) */
  context?: C

  /** A chain to preload (e.g. from saved state) */
  chain?: string | SignatureChain<A, C>

  /** Additional information to include in the root node */
  rootPayload?: any

  /** */
  initialState?: S

  /** */
  reducer: Reducer<S, A>

  /** */
  validators?: ValidatorSet

  /** */
  resolver?: Resolver<A, C>

  /** */
  sequencer?: Sequencer<A, C>
}
