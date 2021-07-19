import {
  Action,
  ActionLink,
  append,
  deserialize,
  getHead,
  getSequence,
  merge,
  Resolver,
  Sequencer,
  serialize,
  SignatureChain,
} from '@/chain'
import { UserWithSecrets } from '@/user'
import { validate, ValidatorSet } from '@/validator'
import EventEmitter from 'events'
import { Reducer } from './types'

export class Store<S, A extends Action> extends EventEmitter {
  constructor({ user, chain, reducer, validators, resolver, sequencer }: CreateStoreOptions<S, A>) {
    super()
    this.chain = typeof chain === 'string' ? deserialize(chain) : chain
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

  public getChain(): SignatureChain<A> {
    return this.chain
  }

  public dispatch(action: A) {
    if (this.isDispatching) throw new Error('Reducers may not dispatch actions.')

    this.isDispatching = true

    // append this action as a new link to the chain
    this.chain = append(this.chain, action, this.user)

    // get the newly appended link
    const head = getHead(this.chain) as ActionLink<A>

    // we don't need to pass the whole chain through the reducer, just the current state + the new head
    this.state = this.reducer(this.state, head)

    this.isDispatching = false
    this.emit('updated', { head: this.chain.head })

    return this
  }

  public merge(theirChain: SignatureChain<A>) {
    this.chain = merge(this.chain, theirChain)
    this.updateState()
    return this
  }

  public save() {
    return serialize(this.chain)
  }

  public validate() {
    return validate(this.chain, this.validators)
  }

  // PRIVATE

  private chain: SignatureChain<A>
  private reducer: Reducer<S, A>
  private sequencer?: Sequencer
  private resolver?: Resolver

  private validators?: ValidatorSet
  private user: UserWithSecrets

  private state: S
  private isDispatching = false

  private updateState() {
    const { chain, resolver, sequencer, reducer } = this

    // Validate the chain's integrity.
    this.validate()

    // Use the resolver & sequencer to turn the graph into an ordered sequence
    const sequence = getSequence<A>({ chain, resolver, sequencer })

    // Run the sequence through the reducer to calculate the current team state
    this.state = sequence.reduce(reducer, {} as S)

    this.emit('updated', { head: chain.head })
  }
}

export const createStore = <S, A extends Action>(options: CreateStoreOptions<S, A>) => {
  return new Store(options)
}

export interface CreateStoreOptions<S, A extends Action> {
  user: UserWithSecrets
  chain: string | SignatureChain<A>
  reducer: Reducer<S, A>
  validators?: ValidatorSet
  resolver?: Resolver
  sequencer?: Sequencer
}
