import { createGraph, deserialize, getHead, getRoot, serialize } from '/graph'
import { setup } from '/test/util/setup'
import '/test/util/expect/toBeValid'
import { validate } from '/validator'
import { TEST_GRAPH_KEYS as graphKeys } from '/test/util/setup'

const { alice } = setup('alice')
const defaultUser = alice

const __ = expect.objectContaining

describe('graphs', () => {
  test('create', () => {
    const graph = createGraph({ user: defaultUser, name: 'a', graphKeys })
    const expected = __({ body: __({ payload: __({ name: 'a' }) }) })
    expect(getRoot(graph)).toEqual(expected)
    expect(getHead(graph)[0]).toEqual(expected)
  })

  test('serialize/deserialize', () => {
    // 👨🏻‍🦲 Bob saves a graph to a file and loads it later
    const graph = createGraph({ user: defaultUser, name: 'Spies Я Us', graphKeys })

    // serialize
    const graphJson = serialize(graph)

    // deserialize
    const rehydratedGraph = deserialize(graphJson, graphKeys)

    expect(validate(rehydratedGraph)).toBeValid()
  })
})
