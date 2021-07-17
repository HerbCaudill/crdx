import { Action, ActionLink, createChain, SignatureChain } from '@/chain'
import { createStore } from '@/store'
import { Reducer } from '@/store/types'
import { createUser } from '@/user'

interface IncrementAction extends Action {
  type: 'INCREMENT'
  payload: { amount?: number }
}

interface DecrementAction extends Action {
  type: 'DECREMENT'
  payload: { amount?: number }
}

interface ResetAction extends Action {
  type: 'RESET'
  payload: {}
}

type CounterAction = IncrementAction | DecrementAction | ResetAction

interface CounterState {
  value: number
}

const reducer: Reducer<CounterState, CounterAction> = (state, link) => {
  const action = link.body
  switch (action.type) {
    case 'ROOT': {
      return { value: 0 }
    }
    case 'INCREMENT': {
      const { amount = 1 } = action.payload
      return {
        ...state,
        value: state.value + amount,
      }
    }
    case 'DECREMENT': {
      const { amount = 1 } = action.payload
      return {
        ...state,
        value: state.value - amount,
      }
    }
    case 'RESET': {
      return {
        ...state,
        value: 0,
      }
    }
  }
}

describe('createStore', () => {
  const setup = () => {
    const user = createUser('alice')
    const chain = createChain<CounterAction>({ name: 'counter' }, user)
    const store = createStore({ user, chain, reducer })
    return { user, store }
  }

  test('counter', () => {
    const { store } = setup()
    expect(store.getState()).toEqual({ value: 0 })

    store.dispatch({ type: 'INCREMENT', payload: {} })

    expect(store.getState()).toEqual({ value: 1 })
  })
})
