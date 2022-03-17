import { getConcurrentBubbles, getConcurrentLinks, HashGraph } from '/chain'
import { buildChain, byPayload, findByPayload, getPayloads } from '../util/chain'

describe('chains', () => {
  describe('getConcurrentLinks', () => {
    const testConcurrentLinks = (chain: HashGraph<any, any>, payload: string, expected: string) => {
      const link = findByPayload(chain, payload)
      const result = getConcurrentLinks(chain, link)
      const payloads = getPayloads(result).split('').sort().join('')
      test(`${payload}: ${expected.length ? expected : '-'}`, () => expect(payloads).toEqual(expected))
    }

    const testBubbles = (chain: HashGraph<any, any>, expected: string) => {
      const bubbles = getConcurrentBubbles(chain)
        .map(b => getPayloads(b.map(h => chain.links[h]).sort(byPayload)))
        .join(',')

      test(expected.length ? `bubbles: ${expected}` : 'no bubbles', () => expect(bubbles).toEqual(expected))
    }

    describe('one link', () => {
      const chain = buildChain('a')
      testConcurrentLinks(chain, 'a', '')
      testBubbles(chain, '')
    })

    describe('no branches', () => {
      const chain = buildChain(`a ─ b ─ c`)
      testConcurrentLinks(chain, 'a', '')
      testConcurrentLinks(chain, 'b', '')
      testConcurrentLinks(chain, 'c', '')
      testBubbles(chain, '')
    })

    describe('simple open chain', () => {
      const chain = buildChain(` 
          ┌─ b
       a ─┤
          └─ c
      `)
      // b | c
      testConcurrentLinks(chain, 'a', '')
      testConcurrentLinks(chain, 'b', 'c')
      testConcurrentLinks(chain, 'c', 'b')

      testBubbles(chain, 'bc')
    })

    describe('simple closed chain', () => {
      const chain = buildChain(`
            ┌─ b ─ c ─┐
         a ─┤         ├─ e
            └─── d ───┘
      `)
      // branch pairs:
      // bc | d
      testConcurrentLinks(chain, 'a', '')
      testConcurrentLinks(chain, 'b', 'd')
      testConcurrentLinks(chain, 'c', 'd')
      testConcurrentLinks(chain, 'd', 'bc')
      testConcurrentLinks(chain, 'e', '')

      testBubbles(chain, 'bcd')
    })

    describe('double closed chain', () => {
      const chain = buildChain(`
            ┌─ b ─ c ─┐     ┌─ f ─ g ─┐
         a ─┤         ├─ e ─┤         ├─ i
            └─── d ───┘     └─── h ───┘
      `)
      // branch pairs:
      // bc | d
      // fg | h
      testConcurrentLinks(chain, 'a', '')
      testConcurrentLinks(chain, 'b', 'd')
      testConcurrentLinks(chain, 'c', 'd')
      testConcurrentLinks(chain, 'd', 'bc')
      testConcurrentLinks(chain, 'e', '')
      testConcurrentLinks(chain, 'f', 'h')
      testConcurrentLinks(chain, 'g', 'h')
      testConcurrentLinks(chain, 'h', 'fg')
      testConcurrentLinks(chain, 'i', '')

      testBubbles(chain, 'bcd,fgh')
    })

    describe('complex chain', () => {
      const chain = buildChain(`
                          ┌─ e ─ g ─┐
                ┌─ c ─ d ─┤         ├─ o ─┐
         a ─ b ─┤         └─── f ───┤     ├─ n
                ├──── h ──── i ─────┘     │
                └───── j ─── k ── l ──────┘
      `)
      // branch pairs:
      // hijkl | cd
      // fhijkl | eg
      // eghijkl | f
      // cdefghio | jkl
      // o | jkl
      testConcurrentLinks(chain, 'a', '')
      testConcurrentLinks(chain, 'b', '')
      testConcurrentLinks(chain, 'c', 'hijkl')
      testConcurrentLinks(chain, 'd', 'hijkl')
      testConcurrentLinks(chain, 'e', 'fhijkl')
      testConcurrentLinks(chain, 'g', 'fhijkl')
      testConcurrentLinks(chain, 'f', 'eghijkl')
      testConcurrentLinks(chain, 'j', 'cdefghio')
      testConcurrentLinks(chain, 'k', 'cdefghio')
      testConcurrentLinks(chain, 'l', 'cdefghio')
      testConcurrentLinks(chain, 'o', 'jkl')
      testConcurrentLinks(chain, 'n', '')
      testBubbles(chain, 'cdefghijklo')
    })

    describe('tricky chain', () => {
      const chain = buildChain(`
                        ┌─── h ────┐
              ┌─ c ─ e ─┤          ├─ k
       a ─ b ─┤         └── i ─ j ─┘
              └── d ────────┘
      `)
      // branch pairs:
      // d | ceh
      // h | dij
      testConcurrentLinks(chain, 'a', '')
      testConcurrentLinks(chain, 'b', '')
      testConcurrentLinks(chain, 'c', 'd')
      testConcurrentLinks(chain, 'e', 'd')
      testConcurrentLinks(chain, 'd', 'ceh')
      testConcurrentLinks(chain, 'h', 'dij')
      testConcurrentLinks(chain, 'i', 'h')
      testConcurrentLinks(chain, 'j', 'h')
      testConcurrentLinks(chain, 'k', '')
      testBubbles(chain, 'cdehij')
    })

    describe('multiple heads', () => {
      const chain = buildChain(`
                          ┌─ e ─ g ─┐
                ┌─ c ─ d ─┤         ├─ o
         a ─ b ─┤         └─── f ───┘
                ├─ h ─ i
                └─ j
      `)
      // branch pairs:
      // cd | hij
      // eg | fhij
      // f | eghij
      // hi | cdefgjo
      // j | cdefghio
      testConcurrentLinks(chain, 'a', '')
      testConcurrentLinks(chain, 'b', '')
      testConcurrentLinks(chain, 'c', 'hij')
      testConcurrentLinks(chain, 'd', 'hij')
      testConcurrentLinks(chain, 'e', 'fhij')
      testConcurrentLinks(chain, 'g', 'fhij')
      testConcurrentLinks(chain, 'f', 'eghij')
      testConcurrentLinks(chain, 'h', 'cdefgjo')
      testConcurrentLinks(chain, 'i', 'cdefgjo')
      testConcurrentLinks(chain, 'j', 'cdefghio')
      testBubbles(chain, 'cdefghijo')
    })
  })
})
