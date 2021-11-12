import { buildChain, getPayloads, XAction } from '../util/chain'
import { getConcurrentLinks, getSequence, Resolver } from '/chain'
import { Hash } from '/util'

/**
 * Custom logic:
 * 1. if `e` and `f` are concurrent, `e` is invalid
 * 2. if `h` and `i` are concurrent, both are invalid
 * 3. `j` comes first, otherwise sort alphabetically
 */
const resolver: Resolver<XAction, any> = chain => {
  const invalid: Record<Hash, boolean> = {}
  for (const link of Object.values(chain.links)) {
    const concurrentLinks = getConcurrentLinks(chain, link)
    for (const concurrentLink of concurrentLinks) {
      // rule 1
      if (link.body.payload === 'f' && concurrentLink.body.payload === 'e') {
        invalid[concurrentLink.hash] = true
      }
      // rule 2
      if (link.body.payload === 'h' && concurrentLink.body.payload === 'i') {
        invalid[link.hash] = true
        invalid[concurrentLink.hash] = true
      }
    }
  }
  return {
    sort: (_a, _b) => {
      const a = _a.body.payload
      const b = _b.body.payload

      // rule 3
      if (a === 'j') return -1
      if (b === 'j') return 1

      if (a < b) return -1
      if (a > b) return 1
      return 0
    },
    filter: link => {
      return !invalid[link.hash]
    },
  }
}

describe('chains', () => {
  describe('getSequence', () => {
    test('one link', () => {
      const chain = buildChain('a')
      const sequence = getSequence(chain)
      const payloads = getPayloads(sequence)
      expect(payloads).toEqual('a')
    })

    test('no branches', () => {
      const chain = buildChain(`a ─ b ─ c`)
      const sequence = getSequence(chain)
      const payloads = getPayloads(sequence)

      expect(payloads).toEqual('abc')
    })

    test('simple chain', () => {
      const chain = buildChain(` 
          ┌─ b
       a ─┤
          └─ c
      `)

      const sequence = getSequence(chain, resolver)
      const payloads = getPayloads(sequence)
      expect(payloads).toEqual('abc')
    })

    test('complex chain', () => {
      const chain = buildChain(`
                          ┌─ e ─ g ─┐
                ┌─ c ─ d ─┤         ├─ o ─┐
         a ─ b ─┤         └─── f ───┤     ├─ n
                ├──── h ──── i ─────┘     │ 
                └───── j ─── k ── l ──────┘           
      `)
      const sequence = getSequence(chain, resolver)
      const payloads = getPayloads(sequence)
      // without resolver we'd get `abcdegfhiojkln`
      // `e` is removed (rule 1)
      // `jkl` comes before `c` (rule 3)
      expect(payloads).toEqual('abjklcdgfhion')
    })

    test('tricky chain', () => {
      const chain = buildChain(`
                          ┌─── h ────┐
                ┌─ c ─ e ─┤          ├─ k
         a ─ b ─┤         └── i ─ j ─┘
                └── d ────────┘
      `)

      const sequence = getSequence(chain, resolver)
      const payloads = getPayloads(sequence)
      // without resolver we'd get `abcehdijk`
      // `h` and `i` are removed (rule 2)
      expect(payloads).toEqual('abcedjk')
    })

    test('multiple heads', () => {
      const chain = buildChain(`
                          ┌─ e ─ g ─┐
                ┌─ c ─ d ─┤         ├─ o 
         a ─ b ─┤         └─── f ───┘     
                ├─ h ─ i  
                └─ j 
      `)
      const sequence = getSequence(chain, resolver)
      const payloads = getPayloads(sequence)
      // without resolver we'd get `abhijcdfego`
      // `e` is removed (rule 1)
      // `j` comes before `c` (rule 3)
      expect(payloads).toEqual('abjcdgfohi')
    })
  })
})
