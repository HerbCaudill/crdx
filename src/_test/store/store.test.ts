import { Action, createChain } from '@/chain'
import { createStore } from '@/store'
import { Reducer } from '@/store/types'
import { createUser } from '@/user'

describe('createStore', () => {
  describe('counter', () => {
    const setup = () => {
      const user = createUser('alice')
      const chain = createChain({ name: 'counter' }, user)
      const store = createStore({ user, chain, reducer })
      return { user, store }
    }

    test('initial state', () => {
      const { store } = setup()
      expect(store.getState()).toEqual({ value: 0 })
    })

    test('increment (default)', () => {
      const { store } = setup()
      store.dispatch({ type: 'INCREMENT' })
      expect(store.getState().value).toEqual(1)
    })

    test('multiple increments (default)', () => {
      const { store } = setup()
      store.dispatch({ type: 'INCREMENT' })
      store.dispatch({ type: 'INCREMENT' })
      store.dispatch({ type: 'INCREMENT' })
      expect(store.getState().value).toEqual(3)
    })

    test('increment by a value', () => {
      const { store } = setup()
      store.dispatch({ type: 'INCREMENT', payload: 17 })
      expect(store.getState().value).toEqual(17)
    })

    test('decrement (default)', () => {
      const { store } = setup()
      store.dispatch({ type: 'DECREMENT' })
      expect(store.getState().value).toEqual(-1)
    })

    test('decrement by a value', () => {
      const { store } = setup()
      store.dispatch({ type: 'DECREMENT', payload: 42 })
      expect(store.getState().value).toEqual(-42)
    })

    test('reset', () => {
      const { store } = setup()
      store.dispatch({ type: 'INCREMENT', payload: 123 })
      expect(store.getState().value).toEqual(123)
      store.dispatch({ type: 'RESET' })
      expect(store.getState().value).toEqual(0)
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
