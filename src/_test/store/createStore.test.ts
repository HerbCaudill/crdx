import '/test/util/expect/toBeValid'
import { CounterAction, counterReducer, CounterState, IncrementAction } from './counter.test'
import { createGraph, getRoot, serialize } from '/graph'
import { createStore } from '/store'
import { TEST_GRAPH_KEYS as graphKeys } from '/test/util/setup'
import { createUser, redactUser } from '/user'
import { asymmetric } from '@herbcaudill/crypto'

const alice = createUser('alice')
const bob = createUser('bob')
const eve = createUser('eve')

describe('createStore', () => {
  test('no graph provided', () => {
    const aliceStore = createStore({ user: alice, reducer: counterReducer, graphKeys })
    const graph = aliceStore.getGraph()
    expect(Object.keys(graph.links)).toHaveLength(1)
  })

  test('serialized graph provided', () => {
    const graph = createGraph<CounterAction>({ user: alice, name: 'counter', graphKeys })
    const aliceStore = createStore({ user: alice, graph, reducer: counterReducer, graphKeys })
    const serializedGraph = aliceStore.save()
    const bobStore = createStore<CounterState, IncrementAction, {}>({
      user: bob,
      graph: serializedGraph,
      reducer: counterReducer,
      graphKeys,
    })
    const bobState = bobStore.getState() as CounterState
    expect(bobState.value).toEqual(0)
  })

  test('Eve tampers with the serialized graph', () => {
    // 👩🏾 Alice makes a new store and saves it
    const graph = createGraph<CounterAction>({ user: alice, name: 'counter', graphKeys })
    const aliceStore = createStore({ user: alice, graph, reducer: counterReducer, graphKeys })

    // 🦹‍♀️ Eve tampers with the serialized graph
    const tamperedGraph = aliceStore.getGraph()
    const rootLink = getRoot(tamperedGraph)
    rootLink.body.userId = eve.userId // she replaces Alice's user info in the root with Eve
    graph.encryptedLinks[tamperedGraph.root] = {
      encryptedBody: asymmetric.encrypt({
        secret: rootLink.body,
        recipientPublicKey: graphKeys.encryption.publicKey,
        senderSecretKey: eve.keys.encryption.secretKey,
      }),
      authorPublicKey: eve.keys.encryption.publicKey,
    }

    const tamperedSerializedGraph = serialize(tamperedGraph)

    // 👩🏾 Alice tries to load the modified graph
    const aliceStoreTheNextDay = createStore<CounterState, IncrementAction, {}>({
      user: alice,
      graph: tamperedSerializedGraph,
      reducer: counterReducer,
      graphKeys,
    })

    // 👩🏾 Alice is not fooled because the graph is no longer valid
    expect(aliceStoreTheNextDay.validate()).not.toBeValid()
  })
})
