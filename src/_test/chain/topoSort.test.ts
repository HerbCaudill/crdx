import { append, createChain, Link, topoSort } from '/chain'
import { buildComplexChain, buildSimpleChain, getPayloads, XAction } from '/test/chain/utils'
import { setup } from '/test/util/setup'

const { alice } = setup('alice')

const byPayload = (a: Link<XAction, any>, b: Link<XAction, any>) => {
  return a.body.payload < b.body.payload ? -1 : a.body.payload > b.body.payload ? 1 : 0
}

describe('chains', () => {
  describe('topoSort', () => {
    /*           
         a 
    */
    test('upon creation', () => {
      var chain = createChain<XAction>({ user: alice, name: 'root' })
      chain = append({ chain, action: { type: 'X', payload: 'a' }, user: alice })
      const sequence = topoSort(chain)
      expect(getPayloads(sequence)).toEqual('a')
    })

    /*           
         a ─ b ─ c
    */
    test('no branches', () => {
      var chain = createChain<XAction>({ user: alice, name: 'root' })
      chain = append({ chain, action: { type: 'X', payload: 'a' }, user: alice })
      chain = append({ chain, action: { type: 'X', payload: 'b' }, user: alice })
      chain = append({ chain, action: { type: 'X', payload: 'c' }, user: alice })
      const sequence = topoSort(chain)

      expect(getPayloads(sequence)).toEqual('abc')
    })

    /*
          ┌─ b
       a ─┤
          └─ c
    */
    test('simple chain sorted by payload', () => {
      var chain = buildSimpleChain()
      const sequence = topoSort(chain, { comparator: byPayload })
      expect(getPayloads(sequence)).toEqual('abc')
    })

    test('simple chain sorted by hash', () => {
      var chain = buildSimpleChain()
      const sequence = topoSort(chain, { comparator: byPayload })
      expect(['abc', 'acb']).toContain(getPayloads(sequence))
    })

    /*
                
                          ┌─ e ─ g ─┐
                ┌─ c ─ d ─┤         ├─ o ─┐
         a ─ b ─┤         └─── f ───┤     ├─ n
                ├──── h ──── i ─────┘     │ 
                └───── j ─── k ── l ──────┘           
    */

    test('complex chain sorted by payload', () => {
      const chain = buildComplexChain()
      const sequence = topoSort(chain, { comparator: byPayload })
      expect(getPayloads(sequence)).toEqual('abcdegfhiojkln')
    })

    test('complex chain sorted by hash', () => {
      const chain = buildComplexChain()
      const sequence = getPayloads(topoSort(chain))

      // we know how the sequence starts and ends
      expect(sequence.startsWith('ab')).toBe(true)
      expect(sequence.endsWith('n')).toBe(true)

      // beyond that here are lots of possibilities;
      // rather than list them all we'll make sure that certain sequences are kept intact...
      expect(sequence.includes('cd')).toBe(true)
      expect(sequence.includes('hi')).toBe(true)
      expect(sequence.includes('jkl')).toBe(true)
      expect(sequence.includes('eg')).toBe(true)

      // ...and links don't appear before links they depend on
      expect(sequence.indexOf('b')).toBeLessThan(sequence.indexOf('c'))
      expect(sequence.indexOf('a')).toBeLessThan(sequence.indexOf('e'))
      expect(sequence.indexOf('a')).toBeLessThan(sequence.indexOf('n'))
      expect(sequence.indexOf('i')).toBeLessThan(sequence.indexOf('o'))
      expect(sequence.indexOf('f')).toBeLessThan(sequence.indexOf('o'))
    })
  })
})
