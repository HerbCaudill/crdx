import { Action, createChain, getRoot } from '@/chain'
import { createStore } from '@/store'
import { Reducer } from '@/store/types'
import { createUser } from '@/user'

const alice = createUser('alice')
const bob = createUser('bob')

const setupCounter = () => {
  const chain = createChain({ name: 'counter' }, alice)
  const aliceStore = createStore({ user: alice, chain, reducer: counterReducer })
  const saved = aliceStore.save()
  const bobStore = createStore({ user: bob, chain: saved, reducer: counterReducer })

  return { store: aliceStore, aliceStore, bobStore }
}

describe('store', () => {
  describe('createStore', () => {
    describe('counter', () => {
      test('initial state', () => {
        const { store } = setupCounter()
        expect(store.getState()).toEqual({ value: 0 })
      })

      test('increment', () => {
        const { store } = setupCounter()
        store.dispatch({ type: 'INCREMENT' })
        expect(store.getState().value).toEqual(1)
      })

      test('multiple increments', () => {
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

      test('decrement', () => {
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
      // 👩🏾 Alice makes a store
      const { store } = setupCounter()
      const chain = store.getChain()

      // 🦹‍♂️ Mallory tampers with the root link
      const payload = getRoot(chain).body.payload
      payload.name = 'Mallory RAWKS'

      // 👩🏾 Alice is not fooled
      expect(store.validate().isValid).toBe(false)
    })
  })

  describe('merge', () => {
    test('concurrent changes', () => {
      const { aliceStore, bobStore } = setupCounter()

      // Bob and Alice make concurrent increments
      aliceStore.dispatch({ type: 'INCREMENT' })
      bobStore.dispatch({ type: 'INCREMENT' })

      // They each only have their own increments
      expect(aliceStore.getState().value).toEqual(1)
      expect(bobStore.getState().value).toEqual(1)

      // They sync up
      aliceStore.merge(bobStore.getChain())
      bobStore.merge(aliceStore.getChain())

      // They each have both increments
      expect(aliceStore.getState().value).toEqual(2)
      expect(bobStore.getState().value).toEqual(2)
    })
  })
})

// Counter

// action types

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

// state

interface CounterState {
  value: number
}

// reducer

const counterReducer: Reducer<CounterState, CounterAction> = (state, link) => {
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
