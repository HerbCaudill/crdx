import { Link, topoSort } from '/chain'
import { buildChain, getPayloads, XAction } from '../util/chain'

describe('chains', () => {
  describe('topoSort', () => {
    test('one link', () => {
      const chain = buildChain('a')
      const sequence = topoSort(chain)
      const payloads = getPayloads(sequence)
      expect(payloads).toEqual('a')
    })

    test('no branches', () => {
      const chain = buildChain(`a ─ b ─ c`)
      const sequence = topoSort(chain)
      const payloads = getPayloads(sequence)

      expect(payloads).toEqual('abc')
    })

    describe('simple chain', () => {
      const chain = buildChain(` 
          ┌─ b
       a ─┤
          └─ c
      `)

      test('sorted by payload', () => {
        const sequence = topoSort(chain, { comparator: byPayload })
        const payloads = getPayloads(sequence)
        expect(payloads).toEqual('abc')
      })

      test('sorted by hash', () => {
        const sequence = topoSort(chain, { comparator: byPayload })
        const payloads = getPayloads(sequence)
        expect(['abc', 'acb']).toContain(payloads)
      })
    })

    describe('complex chain', () => {
      const chain = buildChain(`
                          ┌─ e ─ g ─┐
                ┌─ c ─ d ─┤         ├─ o ─┐
         a ─ b ─┤         └─── f ───┤     ├─ n
                ├──── h ──── i ─────┘     │ 
                └───── j ─── k ── l ──────┘           
      `)
      test('sorted by payload', () => {
        const sequence = topoSort(chain, { comparator: byPayload })
        const payloads = getPayloads(sequence)
        expect(payloads).toEqual('abcdegfhiojkln')
      })

      test('sorted by hash', () => {
        const sequence = topoSort(chain)
        const payloads = getPayloads(sequence)

        // we know how the sequence starts and ends
        expect(payloads.startsWith('ab')).toBe(true)
        expect(payloads.endsWith('n')).toBe(true)

        // beyond that here are lots of possibilities;
        // rather than list them all we'll make sure that certain sequences are kept intact...
        expect(payloads.includes('cd')).toBe(true)
        expect(payloads.includes('hi')).toBe(true)
        expect(payloads.includes('jkl')).toBe(true)
        expect(payloads.includes('eg')).toBe(true)

        // ...and links don't appear before links they depend on
        expect(payloads.indexOf('b')).toBeLessThan(payloads.indexOf('c'))
        expect(payloads.indexOf('a')).toBeLessThan(payloads.indexOf('e'))
        expect(payloads.indexOf('a')).toBeLessThan(payloads.indexOf('n'))
        expect(payloads.indexOf('i')).toBeLessThan(payloads.indexOf('o'))
        expect(payloads.indexOf('f')).toBeLessThan(payloads.indexOf('o'))
      })
    })

    describe('tricky chain', () => {
      const chain = buildChain(`
                          ┌─── h ────┐
                ┌─ c ─ e ─┤          ├─ k
         a ─ b ─┤         └── i ─ j ─┘
                └── d ────────┘
      `)

      test('sorted by payload', () => {
        const sequence = topoSort(chain, { comparator: byPayload })
        const payloads = getPayloads(sequence)
        expect(payloads).toEqual('abcedijhk')
      })

      test('sorted by hash', () => {
        const sequence = topoSort(chain)
        const payloads = getPayloads(sequence)

        expect(payloads.startsWith('ab')).toBe(true)
        expect(payloads.endsWith('k')).toBe(true)

        expect(payloads.includes('ce')).toBe(true)
        expect(payloads.includes('ij')).toBe(true)

        expect(payloads.indexOf('d')).toBeLessThan(payloads.indexOf('i'))
        expect(payloads.indexOf('e')).toBeLessThan(payloads.indexOf('h'))
        expect(payloads.indexOf('e')).toBeLessThan(payloads.indexOf('i'))
      })
    })

    describe('multiple heads', () => {
      const chain = buildChain(`
                          ┌─ e ─ g ─┐
                ┌─ c ─ d ─┤         ├─ o 
         a ─ b ─┤         └─── f ───┘     
                ├─ h ─ i  
                └─ j 
      `)
      test('sorted by payload', () => {
        const sequence = topoSort(chain, { comparator: byPayload })
        const payloads = getPayloads(sequence)
        expect(payloads).toEqual('abcdegfohij')
      })
    })
  })
})

const byPayload = (a: Link<XAction, any>, b: Link<XAction, any>) => {
  return a.body.payload < b.body.payload ? -1 : a.body.payload > b.body.payload ? 1 : 0
}
