import { append, createGraph, decryptGraph, decryptLink, HashGraph } from '/graph'
import { TEST_GRAPH_KEYS } from '/test/util/setup'
import { createUser } from '/user'

const graphKeys = TEST_GRAPH_KEYS

describe('decrypt', () => {
  it('decryptLink', () => {
    const alice = createUser('alice')
    let graph = createGraph<any>({ user: alice, name: 'test graph', graphKeys })
    graph = append({ graph, action: { type: 'FOO' }, user: alice, graphKeys })

    for (const hash in graph.encryptedLinks) {
      const link = graph.encryptedLinks[hash]
      const decryptedLink = decryptLink(link, graphKeys)
      expect(decryptedLink.body).toEqual(graph.links[hash].body)
      expect(decryptedLink.hash).toEqual(hash)
    }
  })

  it('decryptGraph', () => {
    const alice = createUser('alice')
    let graph = createGraph<any>({ user: alice, name: 'test graph', graphKeys })
    graph = append({ graph, action: { type: 'FOO' }, user: alice, graphKeys })

    const encryptedGraph = {
      root: graph.root,
      head: graph.head,
      encryptedLinks: graph.encryptedLinks,
      links: {}, // don't include unencrypted links
    } as HashGraph<any, any>

    const decryptedGraph = decryptGraph(encryptedGraph, graphKeys)
    for (const hash in graph.links) {
      const decrypted = decryptedGraph.links[hash]
      const original = graph.links[hash]
      expect(decrypted.body).toEqual(original.body)
      expect(decrypted.hash).toEqual(original.hash)
    }
  })
})
