import {
  Action,
  ActionLink,
  arbitraryDeterministicSequencer,
  baseResolver,
  Resolver,
  Sequencer,
  SignatureChain,
} from '@/chain'
import { ValidatorSet } from '@/validator'
import EventEmitter from 'events'
import { Reducer } from './types'
import * as chains from '@/chain'
import { UserWithSecrets } from '@/user'

class Store<S, A extends Action> extends EventEmitter {
  private chain: SignatureChain<A>
  private reducer: Reducer<S, A>
  private sequencer?: Sequencer<A>
  private resolver?: Resolver<A>
  private validators?: ValidatorSet
  private user: UserWithSecrets

  private state: S
  private isDispatching = false

  constructor({ user, chain, reducer, validators, resolver, sequencer }: CreateStoreOptions<S, A>) {
    super()
    this.chain = chain
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

  public dispatch(action: A) {
    if (this.isDispatching) throw new Error('Reducers may not dispatch actions.')

    this.isDispatching = true

    // append this action as a new link to the chain
    this.chain = chains.append(this.chain, action, this.user)

    // get the newly appended link
    const head = chains.getHead(this.chain) as ActionLink<A>

    // we don't need to pass the whole chain through the reducer, just the current state + the new head
    this.state = this.reducer(this.state, head)

    this.isDispatching = false

    this.emit('updated', { head: this.chain.head })
  }

  private updateState() {
    // // Validate the chain's integrity.
    // const validation = chains.validate(this.chain)
    // if (!validation.isValid) throw validation.error

    // Run the chain through the reducer to calculate the current team state
    const { chain, resolver, sequencer, reducer } = this
    const sequence = chains.getSequence<A>({ chain, resolver, sequencer })

    this.state = sequence.reduce(reducer, {} as S)

    this.emit('updated', { head: chain.head })
  }
}

export const createStore = <S, A extends Action>(options: CreateStoreOptions<S, A>) => {
  return new Store(options)
}

export interface CreateStoreOptions<S, A extends Action> {
  user: UserWithSecrets
  chain: SignatureChain<A>
  reducer: Reducer<S, A>
  validators?: ValidatorSet
  resolver?: Resolver<A>
  sequencer?: Sequencer<A>
}

type Listener = () => void
