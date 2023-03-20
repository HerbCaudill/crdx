import { asymmetric } from '@herbcaudill/crypto'
import { CounterAction, counterReducer, CounterState, IncrementAction } from './counter.test'
import { createGraph, getRoot, serialize } from '/graph'
import { createStore } from '/store'
import '/test/helpers/expect/toBeValid'
import { TEST_GRAPH_KEYS as keys } from '/test/helpers/setup'
import { createUser } from '/user'

const alice = createUser('alice')
const bob = createUser('bob')
const eve = createUser('eve')

describe('createStore', () => {
  test('no graph provided', () => {
    const aliceStore = createStore({ user: alice, reducer: counterReducer, keys })
    const graph = aliceStore.getGraph()
    expect(Object.keys(graph.links)).toHaveLength(1)
  })

  test('serialized graph provided', () => {
    const graph = createGraph<CounterAction>({ user: alice, name: 'counter', keys })
    const aliceStore = createStore({ user: alice, graph, reducer: counterReducer, keys })
    aliceStore.dispatch({ type: 'INCREMENT' })
    aliceStore.dispatch({ type: 'INCREMENT' })

    const serializedGraph = aliceStore.save()

    const bobStore = createStore<CounterState, IncrementAction, {}>({
      user: bob,
      graph: serializedGraph,
      reducer: counterReducer,
      keys,
    })
    const bobState = bobStore.getState() as CounterState
    expect(bobState.value).toEqual(2)
  })

  test('Eve tampers with the serialized graph', () => {
    // 👩🏾 Alice makes a new store and saves it
    const graph = createGraph<CounterAction>({ user: alice, name: 'counter', keys })
    const aliceStore = createStore({ user: alice, graph, reducer: counterReducer, keys })

    // 🦹‍♀️ Eve tampers with the serialized graph
    const tamperedGraph = aliceStore.getGraph()
    const rootLink = getRoot(tamperedGraph)
    rootLink.body.userId = eve.userId // she replaces Alice's user info in the root with Eve
    graph.encryptedLinks[tamperedGraph.root] = {
      encryptedBody: asymmetric.encrypt({
        secret: rootLink.body,
        recipientPublicKey: keys.encryption.publicKey,
        senderSecretKey: eve.keys.encryption.secretKey,
      }),
      recipientPublicKey: keys.encryption.publicKey,
      senderPublicKey: eve.keys.encryption.publicKey,
    }

    const tamperedSerializedGraph = serialize(tamperedGraph)

    // 👩🏾 Alice tries to load the modified graph
    const aliceStoreTheNextDay = createStore<CounterState, IncrementAction, {}>({
      user: alice,
      graph: tamperedSerializedGraph,
      reducer: counterReducer,
      keys,
    })

    // 👩🏾 Alice is not fooled because the graph is no longer valid
    expect(aliceStoreTheNextDay.validate()).not.toBeValid()
  })
})
