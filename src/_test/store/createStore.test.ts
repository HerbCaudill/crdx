import '/test/util/expect/toBeValid'
import { CounterAction, counterReducer, CounterState, IncrementAction } from './counter.test'
import { createChain, getRoot, serialize } from '/chain'
import { createStore } from '/store'
import { TEST_CHAIN_KEYS as chainKeys } from '/test/util/setup'
import { createUser, redactUser } from '/user'
import { asymmetric } from '@herbcaudill/crypto'

const alice = createUser('alice')
const bob = createUser('bob')
const eve = createUser('eve')

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

  test('Eve tampers with the serialized chain', () => {
    // 👩🏾 Alice makes a new store and saves it
    const chain = createChain<CounterAction>({ user: alice, name: 'counter', chainKeys })
    const aliceStore = createStore({ user: alice, chain, reducer: counterReducer, chainKeys })

    // 🦹‍♀️ Eve tampers with the serialized chain
    const tamperedChain = aliceStore.getChain()
    const rootLink = getRoot(tamperedChain)
    rootLink.body.userId = eve.userId // she replaces Alice's user info in the root with Eve
    chain.encryptedLinks[tamperedChain.root] = {
      encryptedBody: asymmetric.encrypt({
        secret: rootLink.body,
        recipientPublicKey: chainKeys.encryption.publicKey,
        senderSecretKey: eve.keys.encryption.secretKey,
      }),
      authorPublicKey: eve.keys.encryption.publicKey,
    }

    const tamperedSerializedChain = serialize(tamperedChain)

    // 👩🏾 Alice tries to load the modified chain
    const aliceStoreTheNextDay = createStore<CounterState, IncrementAction, {}>({
      user: alice,
      chain: tamperedSerializedChain,
      reducer: counterReducer,
      chainKeys,
    })

    // 👩🏾 Alice is not fooled because the chain is no longer valid
    expect(aliceStoreTheNextDay.validate()).not.toBeValid()
  })
})
