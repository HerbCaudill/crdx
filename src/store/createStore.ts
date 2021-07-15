import { Action, Resolver, Sequencer, SignatureChain } from '@/chain'
import { ValidatorSet } from '@/validator'
import { Reducer } from './types'

class Store<A extends Action, S> {
  private chain: SignatureChain<A>
  private reducer: Reducer<S>
  private sequencer: Sequencer<A>
  private resolver: Resolver<Action>
  private validators: ValidatorSet

  private state: S
  private isDispatching = false
  private listeners: Listener[]

  constructor({ preloadedChain, reducer, validators, resolver, sequencer }: CreateStoreOptions<A, S>) {
    this.chain = preloadedChain
    this.reducer = reducer
    this.validators = validators
    this.resolver = resolver
    this.sequencer = sequencer
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

  public dispatch(action: A) {}

  public subscribe(listener: Listener) {}
}

export const createStore = <A extends Action, S>(options: CreateStoreOptions<A, S>) => {
  return new Store(options)
}

export interface CreateStoreOptions<A extends Action, S> {
  preloadedChain: SignatureChain<A>
  reducer: Reducer<S>
  validators: ValidatorSet
  resolver: Resolver
  sequencer: Sequencer<A>
}

type Listener = () => void
