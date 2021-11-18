import { CounterAction, counterReducer, CounterState, IncrementAction } from './counter.test'
import { createChain } from '/chain'
import { createStore } from '/store'
import { createUser } from '/user'

const alice = createUser('alice')
const bob = createUser('bob')

describe('createStore', () => {
  test('no chain provided', () => {
    const aliceStore = createStore({ user: alice, reducer: counterReducer })
    const chain = aliceStore.getChain()
    expect(Object.keys(chain.links)).toHaveLength(1)
  })

  test('serialized chain provided', () => {
    const chain = createChain<CounterAction>({ user: alice, name: 'counter' })
    const aliceStore = createStore({ user: alice, chain, reducer: counterReducer })
    const serializedChain = aliceStore.save()
    const bobStore = createStore<CounterState, IncrementAction, {}>({
      user: bob,
      chain: serializedChain,
      reducer: counterReducer,
    })
    const bobState = bobStore.getState() as CounterState
    expect(bobState.value).toEqual(0)
  })
})
