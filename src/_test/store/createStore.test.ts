import { CounterAction, counterReducer, CounterState, IncrementAction } from './counter.test'
import { createChain } from '/chain'
import { createStore } from '/store'
import { TEST_CHAIN_KEYS as chainKeys } from '/test/util/setup'
import { createUser } from '/user'

const alice = createUser('alice')
const bob = createUser('bob')

describe('createStore', () => {
  test('no chain provided', () => {
    const aliceStore = createStore({ user: alice, reducer: counterReducer, chainKeys })
    const chain = aliceStore.getChain()
    expect(Object.keys(chain.links)).toHaveLength(1)
  })

  test('serialized chain provided', () => {
    const chain = createChain<CounterAction>({ user: alice, name: 'counter', chainKeys })
    const aliceStore = createStore({ user: alice, chain, reducer: counterReducer, chainKeys })
    const serializedChain = aliceStore.save()
    const bobStore = createStore<CounterState, IncrementAction, {}>({
      user: bob,
      chain: serializedChain,
      reducer: counterReducer,
      chainKeys,
    })
    const bobState = bobStore.getState() as CounterState
    expect(bobState.value).toEqual(0)
  })
})
