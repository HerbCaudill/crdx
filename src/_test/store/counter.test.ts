import { Action, createChain, getRoot } from '/chain'
import { createStore } from '/store'
import { Reducer } from '/store/types'
import { createUser } from '/user'

/*
This is intended to be the simplest possible proof of concept: An increment-only counter. There is
no custom resolver because there are no conflicts possible. 
*/

const alice = createUser('alice')
const bob = createUser('bob')

const setupCounter = () => {
  const chain = createChain<CounterAction>({ user: alice, name: 'counter' })
  const aliceStore = createStore({ user: alice, chain, reducer: counterReducer })

  const saved = aliceStore.getChain()
  const bobStore = createStore({ user: bob, chain: saved, reducer: counterReducer })

  return { store: aliceStore, aliceStore, bobStore }
}

describe('counter', () => {
  describe('createStore', () => {
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
  })

  describe('validation', () => {
    test('tampering with chain is detected', () => {
      // 👩🏾 Alice makes a store
      const { store } = setupCounter()
      const chain = store.getChain()

      // 🦹‍♂️ Mallory tampers with the root link
      const payload = getRoot(chain).body.payload
      payload.name = 'Mallory RAWKS'

      // 👩🏾 Alice is not fooled
      expect(() => store.validate()).toThrow()
    })
  })

  describe('merge', () => {
    test('concurrent changes are merged', () => {
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

type CounterAction = IncrementAction

interface IncrementAction extends Action {
  type: 'INCREMENT'
  payload: number
}

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

    default:
      return state
  }
}
