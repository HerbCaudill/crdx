import { getConcurrentLinks, SignatureChain } from '/chain'
import { buildChain, findByPayload, getPayloads } from '../util/chain'

describe('chains', () => {
  describe('getConcurrentLinks', () => {
    const testCase = (chain: SignatureChain<any, any>, payload: string, expected: string) => {
      const link = findByPayload(chain, payload)
      const result = getConcurrentLinks(chain, link)
      const payloads = getPayloads(result)
        .split('')
        .sort()
        .join('')
      test(payload, () => expect(payloads).toEqual(expected))
    }

    describe('one link', () => {
      const chain = buildChain('a')
      testCase(chain, 'a', '')
    })

    describe('no branches', () => {
      const chain = buildChain(`a ─ b ─ c`)
      testCase(chain, 'a', '')
      testCase(chain, 'b', '')
      testCase(chain, 'c', '')
    })

    describe('simple open chain', () => {
      const chain = buildChain(` 
          ┌─ b
       a ─┤
          └─ c
      `)
      testCase(chain, 'a', '')
      testCase(chain, 'b', 'c')
      testCase(chain, 'c', 'b')
    })

    describe('simple closed chain', () => {
      const chain = buildChain(`
            ┌─ b ─ c ─┐
         a ─┤         ├─ e
            └─── d ───┘
      `)

      testCase(chain, 'a', '')
      testCase(chain, 'b', 'd')
      testCase(chain, 'c', 'd')
      testCase(chain, 'd', 'bc')
      testCase(chain, 'e', '')
    })

    describe('double closed chain', () => {
      const chain = buildChain(`
            ┌─ b ─ c ─┐     ┌─ f ─ g ─┐
         a ─┤         ├─ e ─┤         ├─ i
            └─── d ───┘     └─── h ───┘
      `)

      testCase(chain, 'a', '')
      testCase(chain, 'b', 'd')
      testCase(chain, 'c', 'd')
      testCase(chain, 'd', 'bc')
      testCase(chain, 'e', '')
      testCase(chain, 'f', 'h')
      testCase(chain, 'g', 'h')
      testCase(chain, 'h', 'fg')
      testCase(chain, 'i', '')
    })

    describe('complex chain', () => {
      const chain = buildChain(`
                          ┌─ e ─ g ─┐
                ┌─ c ─ d ─┤         ├─ o ─┐
         a ─ b ─┤         └─── f ───┤     ├─ n
                ├──── h ──── i ─────┘     │
                └───── j ─── k ── l ──────┘
      `)
      testCase(chain, 'a', '')
      testCase(chain, 'b', '')
      testCase(chain, 'c', 'hijkl')
      testCase(chain, 'd', 'hijkl')
      testCase(chain, 'e', 'fhijkl')
      testCase(chain, 'g', 'fhijkl')
      testCase(chain, 'f', 'eghijkl')
      testCase(chain, 'j', 'cdefghio')
      testCase(chain, 'k', 'cdefghio')
      testCase(chain, 'l', 'cdefghio')
      testCase(chain, 'o', 'jkl')
      testCase(chain, 'n', '')
    })

    describe('tricky chain', () => {
      const chain = buildChain(`
                        ┌─── h ────┐
              ┌─ c ─ e ─┤          ├─ k
       a ─ b ─┤         └── i ─ j ─┘
              └── d ────────┘
    `)

      testCase(chain, 'a', '')
      testCase(chain, 'b', '')
      testCase(chain, 'c', 'd')
      testCase(chain, 'e', 'd')
      testCase(chain, 'd', 'ceh')
      testCase(chain, 'h', 'dij')
      testCase(chain, 'i', 'h')
      testCase(chain, 'j', 'h')
      testCase(chain, 'k', '')
    })

    describe('multiple heads', () => {
      const chain = buildChain(`
                          ┌─ e ─ g ─┐
                ┌─ c ─ d ─┤         ├─ o
         a ─ b ─┤         └─── f ───┘
                ├─ h ─ i
                └─ j
      `)
      testCase(chain, 'a', '')
      testCase(chain, 'b', '')
      testCase(chain, 'c', 'hij')
      testCase(chain, 'd', 'hij')
      testCase(chain, 'e', 'fhij')
      testCase(chain, 'g', 'fhij')
      testCase(chain, 'f', 'eghij')
      testCase(chain, 'h', 'cdefgjo')
      testCase(chain, 'i', 'cdefgjo')
      testCase(chain, 'j', 'cdefghio')
    })
  })
})
