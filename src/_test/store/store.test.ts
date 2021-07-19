import { Action, createChain, getRoot } from '@/chain'
import { createStore } from '@/store'
import { Reducer } from '@/store/types'
import { createUser } from '@/user'

const alice = createUser('alice')

const setupCounter = () => {
  const chain = createChain({ name: 'counter' }, alice)
  const store = createStore({ user: alice, chain, reducer })
  return { store }
}

describe('store', () => {
  describe('createStore', () => {
    describe('counter', () => {
      test('initial state', () => {
        const { store } = setupCounter()
        expect(store.getState()).toEqual({ value: 0 })
      })

      test('increment (default)', () => {
        const { store } = setupCounter()
        store.dispatch({ type: 'INCREMENT' })
        expect(store.getState().value).toEqual(1)
      })

      test('multiple increments (default)', () => {
        const { store } = setupCounter()
        store.dispatch({ type: 'INCREMENT' })
        store.dispatch({ type: 'INCREMENT' })
        store.dispatch({ type: 'INCREMENT' })
        expect(store.getState().value).toEqual(3)
      })

      test('increment by a value', () => {
        const { store } = setupCounter()
        store.dispatch({ type: 'INCREMENT', payload: 17 })
        expect(store.getState().value).toEqual(17)
      })

      test('decrement (default)', () => {
        const { store } = setupCounter()
        store.dispatch({ type: 'DECREMENT' })
        expect(store.getState().value).toEqual(-1)
      })

      test('decrement by a value', () => {
        const { store } = setupCounter()
        store.dispatch({ type: 'DECREMENT', payload: 42 })
        expect(store.getState().value).toEqual(-42)
      })

      test('reset', () => {
        const { store } = setupCounter()
        store.dispatch({ type: 'INCREMENT', payload: 123 })
        expect(store.getState().value).toEqual(123)
        store.dispatch({ type: 'RESET' })
        expect(store.getState().value).toEqual(0)
      })
    })
  })

  describe('validation', () => {
    test('Mallory tampers with the payload; Bob is not fooled', () => {
      // 👩🏾 Alice
      const { store } = setupCounter()
      // @ts-ignore (accessing private member)
      const chain = store.chain

      // 🦹‍♂️ Mallory
      const payload = getRoot(chain).body.payload
      payload.name = 'Mallory RAWKS'

      // 👨🏻‍🦲 Bob finds that the chain is no longer valid
      expect(store.validate().isValid).toBe(false)
    })
  })
})

// Counter

interface IncrementAction extends Action {
  type: 'INCREMENT'
  payload?: number
}

interface DecrementAction extends Action {
  type: 'DECREMENT'
  payload?: number
}

interface ResetAction extends Action {
  type: 'RESET'
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
      const step = action.payload ?? 1
      return {
        ...state,
        value: state.value + step,
      }
    }

    case 'DECREMENT': {
      const step = action.payload ?? 1

      return {
        ...state,
        value: state.value - step,
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
