import { append, createGraph, getHead, getRoot } from '/graph'
import '/test/util/expect/toBeValid'
import { setup } from '/test/util/setup'
import { validate } from '/validator'

const { alice } = setup('alice')
const defaultUser = alice

import { TEST_GRAPH_KEYS as keys } from '/test/util/setup'

const __ = expect.objectContaining

describe('graphs', () => {
  test('append', () => {
    const graph1 = createGraph({ user: defaultUser, name: 'a', keys })
    const graph2 = append({ graph: graph1, action: { type: 'FOO', payload: 'b' }, user: defaultUser, keys })

    expect(validate(graph2)).toBeValid()

    expect(getRoot(graph2)).toEqual(__({ body: __({ payload: __({ name: 'a' }) }) }))
    expect(getHead(graph2)).toEqual([__({ body: __({ payload: 'b' }) })])
  })
})
