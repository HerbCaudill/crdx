import { append, createGraph, decryptGraph, decryptLink, redactGraph } from '/graph'
import { TEST_GRAPH_KEYS } from '/test/util/setup'
import { createUser } from '/user'

const keys = TEST_GRAPH_KEYS

describe('decrypt', () => {
  it('decryptLink', () => {
    const alice = createUser('alice')
    let graph = createGraph<any>({ user: alice, name: 'test graph', keys })
    graph = append({ graph, action: { type: 'FOO' }, user: alice, keys })

    for (const hash in graph.encryptedLinks) {
      const link = graph.encryptedLinks[hash]
      const decryptedLink = decryptLink(link, keys)
      expect(decryptedLink.body).toEqual(graph.links[hash].body)
      expect(decryptedLink.hash).toEqual(hash)
    }
  })

  it('decryptGraph', () => {
    const alice = createUser('alice')
    let graph = createGraph<any>({ user: alice, name: 'test graph', keys })
    graph = append({ graph, action: { type: 'FOO' }, user: alice, keys })

    const childMap = getChildMap(graph)
    const encryptedGraph = {
      root: graph.root,
      head: graph.head,
      encryptedLinks: graph.encryptedLinks,
    } as EncryptedHashGraph

    const decryptedGraph = decryptGraph({ encryptedGraph, keys, childMap })
    for (const hash in graph.links) {
      const decrypted = decryptedGraph.links[hash]
      const original = graph.links[hash]
      expect(decrypted.body).toEqual(original.body)
      expect(decrypted.hash).toEqual(original.hash)
    }
  })
})
