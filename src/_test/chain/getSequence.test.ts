import { randomKey } from '@herbcaudill/crypto'
import { append, arbitraryDeterministicSort, createChain, getSequence, Resolver, Sequence } from '/chain'
import { buildChain, findByPayload, getPayloads, XAction, XLink } from '/test/chain/utils'
import { setup } from '/test/util/setup'

const { alice } = setup('alice')

const byPayload = (a: Sequence<XAction, any>, b: Sequence<XAction, any>) => {
  const [aPayload, bPayload] = [a, b].map(branch => getPayloads(branch))
  return aPayload < bPayload ? -1 : aPayload > bPayload ? 1 : 0
}

const alphabeticalResolver: Resolver<XAction, any> = branches => {
  const [a, b] = branches.sort(byPayload)
  return a.concat(b)
}

const randomResolver: Resolver<any, any> = ([a, b]) => {
  // change the hash key on each run, to ensure our tests aren't bound to one arbitrary sort
  const hashKey = randomKey()
  const [_a, _b] = [a, b].sort(arbitraryDeterministicSort(hashKey))
  return _a.concat(_b)
}

describe('chains', () => {
  describe('getSequence', () => {
    test('upon creation', () => {
      var chain = createChain({ user: alice, name: 'root' })
      chain = append({ chain, action: { type: 'X', payload: 'a' }, user: alice })
      const sequence = getSequence({ chain, resolver: randomResolver })
      expect(getPayloads(sequence)).toEqual(['a'])
    })

    test('no branches', () => {
      var chain = createChain({ user: alice, name: 'root' })
      chain = append({ chain, action: { type: 'X', payload: 'a' }, user: alice })
      chain = append({ chain, action: { type: 'X', payload: 'b' }, user: alice })
      chain = append({ chain, action: { type: 'X', payload: 'c' }, user: alice })
      const sequence = getSequence({ chain, resolver: randomResolver })

      const expected = 'a b c'

      expect(getPayloads(sequence)).toEqual(expected)
    })

    test('simple chain', () => {
      const chain = buildChain(` 
          ┌─ b
       a ─┤
          └─ c
      `)
      const sequence = getSequence({ chain, resolver: alphabeticalResolver })
      expect(getPayloads(sequence)).toEqual('abc')
    })

    describe('complex chain', () => {
      const chain = buildChain(`
                          ┌─ e ─ g ─┐
                ┌─ c ─ d ─┤         ├─ o ─┐
         a ─ b ─┤         └─── f ───┤     ├─ n
                ├──── h ──── i ─────┘     │ 
                └───── j ─── k ── l ──────┘           
      `)

      test('full sequence', () => {
        const sequence = getSequence({ chain, resolver: alphabeticalResolver })
        expect(getPayloads(sequence)).toEqual('abcdegfhiojkln')
      })

      test('root', () => {
        const b = findByPayload(chain, 'b')
        const sequence = getSequence<any, any>({ chain, root: b, resolver: randomResolver })

        const expected = [
          'b jkl cdfeg hi on',
          'b jkl cdegf hi on',

          'b jkl hi cdfeg on',
          'b jkl hi cdegf on',

          'b hi cdfeg jkl on',
          'b hi cdegf jkl on',

          'b hi cdfeg o jkl n',
          'b hi cdegf o jkl n',

          'b cdfeg hi o jkl n',
          'b cdegf hi o jkl n',

          'b cdfeg hi jkl on',
          'b cdegf hi jkl on',
        ].map(trim)

        expect(expected).toContainEqual(getPayloads(sequence))
      })

      test('head', () => {
        const d = findByPayload(chain, 'd')
        const sequence = getSequence<any, any>({ chain, head: [d], resolver: randomResolver })

        const expected = 'abcd'

        expect(getPayloads(sequence)).toEqual(expected)
      })

      test('root & head', () => {
        const j = findByPayload(chain, 'j')
        const l = findByPayload(chain, 'l')
        const sequence = getSequence<any, any>({ chain, root: j, head: [l], resolver: randomResolver })

        const expected = 'j k l'

        expect(getPayloads(sequence)).toEqual(expected)
      })

      test('root within a branch', () => {
        const c = findByPayload(chain, 'c')
        const sequence = getSequence<any, any>({ chain, root: c, resolver: randomResolver })

        expect(['cdegfon', 'cdfegon']).toContainEqual(getPayloads(sequence))
      })

      test('custom resolver', () => {
        const resolver: Resolver<XAction, any> = ([_a, _b]) => {
          // inclusion rules: `e`s are omitted

          const eFilter = (n: XLink) => n.body.payload !== 'e'
          const [a, b] = [_a.filter(eFilter), _b.filter(eFilter)]

          // sequence rules: `i`s go first, otherwise alphabetical

          const alpha = (a: XLink, b: XLink) => (a.body.payload! > b.body.payload! ? 1 : -1)
          const merged = a.concat(b).sort(alpha)

          const isI = (n: XLink) => n.body.payload === 'i'
          const Is = merged.filter(n => isI(n))
          const notIs = merged.filter(n => !isI(n))

          const sequencedBranches = Is.concat(notIs)

          return sequencedBranches
        }

        const sequence = getSequence({ chain, resolver })

        // note that `i` comes first in the merged portion, and `e` is omitted
        const expected = 'abicdfghjklon'

        expect(getPayloads(sequence)).toEqual(expected)
      })
    })
  })
})

const trim = (s: string) => s.replace(/\s*/g, '')
