import { getLink, SignatureChain } from '/chain'
import { getLinkMap } from '/chain/linkMap'
import { buildChain, findByPayload } from '/test/util/chain'
import { Hash } from '/util'

describe('getLinkMap', () => {
  const chain = buildChain(`
                          ┌─ e ─ g ─┐
                ┌─ c ─ d ─┤         ├─ o ─┐
         a ─ b ─┤         └─── f ───┤     ├─ n
                ├──── h ──── i ─────┘     │ 
                └───── j ─── k ── l ──────┘           
      `)

  describe('recent hashes', () => {
    it('depth 2', () => {
      const result = getLinkMap({ chain, depth: 2 })
      expect(lookupPayloads(chain, result)).toEqual({
        l: 'k',
        n: 'l,o',
        o: 'f,g,i',
      })
    })

    it('depth 3', () => {
      const result = getLinkMap({ chain, depth: 3 })
      expect(lookupPayloads(chain, result)).toEqual({
        f: 'd',
        g: 'e',
        i: 'h',
        k: 'j',
        l: 'k',
        n: 'l,o',
        o: 'f,g,i',
      })
    })

    it('depth 10', () => {
      const result = getLinkMap({ chain, depth: 10 })

      // this covers the whole chain because the longest path through it is less than 10 links long
      expect(lookupPayloads(chain, result)).toEqual({
        a: '',
        b: 'a',
        c: 'b',
        d: 'c',
        e: 'd',
        f: 'd',
        g: 'e',
        i: 'h',
        h: 'b',
        k: 'j',
        j: 'b',
        l: 'k',
        n: 'l,o',
        o: 'f,g,i',
      })
    })

    it('entire chain', () => {
      const result = getLinkMap({ chain }) // depth is undefined
      expect(lookupPayloads(chain, result)).toEqual({
        a: '',
        b: 'a',
        c: 'b',
        d: 'c',
        e: 'd',
        f: 'd',
        g: 'e',
        i: 'h',
        h: 'b',
        k: 'j',
        j: 'b',
        l: 'k',
        n: 'l,o',
        o: 'f,g,i',
      })
    })
  })

  describe('end links', () => {
    const getHashes = (s: string) => s.split('').map(p => findByPayload(chain, p).hash)

    it('b', () => {
      const result = getLinkMap({ chain, end: getHashes('b') })
      expect(lookupPayloads(chain, result)).toEqual({
        c: 'b',
        d: 'c',
        e: 'd',
        f: 'd',
        g: 'e',
        i: 'h',
        h: 'b',
        k: 'j',
        j: 'b',
        l: 'k',
        n: 'l,o',
        o: 'f,g,i',
      })
    })

    it('chj', () => {
      const result = getLinkMap({ chain, end: getHashes('chj') })
      expect(lookupPayloads(chain, result)).toEqual({
        d: 'c',
        e: 'd',
        f: 'd',
        g: 'e',
        i: 'h',
        k: 'j',
        l: 'k',
        n: 'l,o',
        o: 'f,g,i',
      })
    })

    it('gfik', () => {
      const result = getLinkMap({ chain, end: getHashes('gfik') })
      expect(lookupPayloads(chain, result)).toEqual({
        l: 'k',
        n: 'l,o',
        o: 'f,g,i',
      })
    })
  })

  describe('get more recent hashes', () => {
    it('depth 2 + 2', () => {
      const prev = getLinkMap({ chain, depth: 2 })

      expect(lookupPayloads(chain, prev)).toEqual({
        l: 'k',
        n: 'l,o',
        o: 'f,g,i',
      })
      const result = getLinkMap({ chain, depth: 2, prev })
      expect(lookupPayloads(chain, result)).toEqual({
        d: 'c',
        e: 'd',
        f: 'd',
        g: 'e',
        h: 'b',
        i: 'h',
        j: 'b',
        k: 'j',
      })
    })
  })
})

const lookupPayloads = (chain: SignatureChain<any, any>, linkMap: Record<Hash, Hash[]>): Record<string, string> => {
  const getPayload = (hash: Hash): string => {
    const linkBody = getLink(chain, hash).body
    return linkBody.type === 'ROOT' ? '' : linkBody.payload
  }
  return Object.entries(linkMap).reduce((result, [hash, predecessors]) => {
    const key = getPayload(hash)
    const payload = predecessors.map(getPayload).sort().join()
    return {
      ...result,
      ...(key.length ? { [key]: payload } : {}),
    }
  }, {})
}
