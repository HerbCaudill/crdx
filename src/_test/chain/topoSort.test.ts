import { append, createChain, Link, Resolver, Sequence, topoSort } from '/chain'
import { buildComplexChain, buildSimpleChain, findByPayload, getPayloads, XAction, XLink } from '/test/chain/utils'
import { setup } from '/test/util/setup'

const { alice } = setup('alice')

const byPayload = (a: Link<XAction, any>, b: Link<XAction, any>) => {
  return a.body.payload < b.body.payload ? -1 : a.body.payload > b.body.payload ? 1 : 0
}

describe('chains', () => {
  describe('topoSort', () => {
    test('upon creation', () => {
      var chain = createChain<XAction>({ user: alice, name: 'root' })
      chain = append({ chain, action: { type: 'X', payload: 'a' }, user: alice })
      const sequence = topoSort(chain)
      expect(getPayloads(sequence)).toEqual('a')
    })

    test('no branches', () => {
      var chain = createChain<XAction>({ user: alice, name: 'root' })
      chain = append({ chain, action: { type: 'X', payload: 'a' }, user: alice })
      chain = append({ chain, action: { type: 'X', payload: 'b' }, user: alice })
      chain = append({ chain, action: { type: 'X', payload: 'c' }, user: alice })
      const sequence = topoSort(chain)

      expect(getPayloads(sequence)).toEqual('abc')
    })

    test('simple chain sorted by hash comparator', () => {
      var chain = buildSimpleChain()
      const sequence = topoSort(chain, { comparator: byPayload })
      expect(['abc', 'acb']).toContain(getPayloads(sequence))
    })

    test('simple chain sorted by payload', () => {
      var chain = buildSimpleChain()
      const sequence = topoSort(chain, { comparator: byPayload })
      expect(getPayloads(sequence)).toEqual('abc')
    })

    /*           
                
                          ┌─ e ─ g ─┐
                ┌─ c ─ d ─┤         ├─ o ─┐
         a ─ b ─┤         └─── f ───┤     ├─ n
                ├──── h ──── i ─────┘     │ 
                └───── j ─── k ── l ──────┘           
    */

    test('complex chain', () => {
      const chain = buildComplexChain()
      const sequence = topoSort(chain, { comparator: byPayload })
      expect(getPayloads(sequence)).toEqual('abcdegfhiojkln')
    })

    // test('root', () => {
    //   const sequence = topoSort(chain)

    //   const expected = [
    //     'ab jkl cdfeg hi on',
    //     'ab jkl cdegf hi on',
    //     'ab jkl hi cdfeg on',
    //     'ab jkl hi cdegf on',
    //     'ab hi cdfeg jkl on',
    //     'ab hi cdegf jkl on',
    //     'ab hi cdfeg o jkl n',
    //     'ab hi cdegf o jkl n',
    //     'ab cdfeg hi o jkl n',
    //     'ab cdegf hi o jkl n',
    //     'ab cdfeg hi jkl on',
    //     'ab cdegf hi jkl on',
    //   ].map(removeWhitespace)

    //   expect(expected).toContainEqual(getPayloads(sequence))
    // })

    // test('head', () => {
    //   const d = findByPayload(chain, 'd')
    //   const sequence = topoSort<any, any>({ chain, head: [d], resolver: randomResolver })

    //   const expected = 'a b c d'

    //   expect(getPayloads(sequence)).toEqual(split(expected))
    // })

    // test('root & head', () => {
    //   const j = findByPayload(chain, 'j')
    //   const l = findByPayload(chain, 'l')
    //   const sequence = topoSort<any, any>({ chain, root: j, head: [l], resolver: randomResolver })

    //   const expected = 'j k l'

    //   expect(getPayloads(sequence)).toEqual(split(expected))
    // })

    // test('root within a branch', () => {
    //   const c = findByPayload(chain, 'c')
    //   const sequence = topoSort<any, any>({ chain, root: c, resolver: randomResolver })

    //   const expected = [
    //     'c d   e g   f   o n', //
    //     'c d   f   e g   o n',
    //   ].map(split)

    //   expect(expected).toContainEqual(getPayloads(sequence))
    // })

    // test('custom resolver', () => {
    //   const resolver: Resolver<XAction, any> = ([_a, _b]) => {
    //     // inclusion rules: `e`s are omitted

    //     const eFilter = (n: XLink) => n.body.payload !== 'e'
    //     const [a, b] = [_a.filter(eFilter), _b.filter(eFilter)]

    //     // sequence rules: `i`s go first, otherwise alphabetical

    //     const alpha = (a: XLink, b: XLink) => (a.body.payload! > b.body.payload! ? 1 : -1)
    //     const merged = a.concat(b).sort(alpha)

    //     const isI = (n: XLink) => n.body.payload === 'i'
    //     const Is = merged.filter(n => isI(n))
    //     const notIs = merged.filter(n => !isI(n))

    //     const sequencedBranches = Is.concat(notIs)

    //     return sequencedBranches
    //   }

    //   const sequence = topoSort({ chain, resolver })

    //   // note that `i` comes first in the merged portion, and `e` is omitted
    //   const expected = 'a b   i c d f g h j k l o    n'

    //   expect(getPayloads(sequence)).toEqual(split(expected))
    // })
  })

  // split on whitespace
  const split = (s: string) => s.split(/\s*/)
  const removeWhitespace = (s: string) => s.replace(/\s*/g, '')
})
