import { randomKey } from '@herbcaudill/crypto'
import { append, arbitraryDeterministicSort, createChain, getSequence, Resolver } from '/chain'
import { buildChain, findByPayload, getPayloads, XAction, XLink } from '/test/chain/utils'
import { setup } from '/test/util/setup'

const { alice } = setup('alice')

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

      expect(getPayloads(sequence)).toEqual(split(expected))
    })

    /*                      ┌─→ e ─→ g ─┐
         a ─→ b ─┬─→ c ─→ d ┴─→ f ───── * ── * ─→ o ── * ─→ n
                 ├─→ h ─→ i ─────────────────┘         │
                 └─→ j ─→ k ─→ l ──────────────────────┘           */

    describe('complex chain', () => {
      const chain = buildChain()

      test('full sequence', () => {
        const sequence = getSequence({ chain, resolver: randomResolver })

        // the resolved sequence will be one of these
        const expected = [
          'a b   j k l   c d f e g   h i   o n',
          'a b   j k l   c d e g f   h i   o n',

          'a b   j k l   h i   c d f e g   o n',
          'a b   j k l   h i   c d e g f   o n',

          'a b   h i   c d f e g   j k l   o n',
          'a b   h i   c d e g f   j k l   o n',

          'a b   h i   c d f e g  o  j k l   n',
          'a b   h i   c d e g f  o  j k l   n',

          'a b   c d f e g   h i  o  j k l   n',
          'a b   c d e g f   h i  o  j k l   n',

          'a b   c d f e g   h i   j k l   o n',
          'a b   c d e g f   h i   j k l   o n',
        ].map(split)

        expect(expected).toContainEqual(getPayloads(sequence))
      })

      test('root', () => {
        const b = findByPayload(chain, 'b')
        const sequence = getSequence<any, any>({ chain, root: b, resolver: randomResolver })

        const expected = [
          'b   j k l   c d f e g   h i   o n',
          'b   j k l   c d e g f   h i   o n',

          'b   j k l   h i   c d f e g   o n',
          'b   j k l   h i   c d e g f   o n',

          'b   h i   c d f e g   j k l   o n',
          'b   h i   c d e g f   j k l   o n',

          'b   h i   c d f e g  o  j k l   n',
          'b   h i   c d e g f  o  j k l   n',

          'b   c d f e g   h i  o  j k l   n',
          'b   c d e g f   h i  o  j k l   n',

          'b   c d f e g   h i   j k l   o n',
          'b   c d e g f   h i   j k l   o n',
        ].map(split)

        expect(expected).toContainEqual(getPayloads(sequence))
      })

      test('head', () => {
        const d = findByPayload(chain, 'd')
        const sequence = getSequence<any, any>({ chain, head: d, resolver: randomResolver })

        const expected = 'a b c d'

        expect(getPayloads(sequence)).toEqual(split(expected))
      })

      test('root & head', () => {
        const j = findByPayload(chain, 'j')
        const l = findByPayload(chain, 'l')
        const sequence = getSequence<any, any>({ chain, root: j, head: l, resolver: randomResolver })

        const expected = 'j k l'

        expect(getPayloads(sequence)).toEqual(split(expected))
      })

      test('root within a branch', () => {
        const c = findByPayload(chain, 'c')
        const sequence = getSequence<any, any>({ chain, root: c, resolver: randomResolver })

        const expected = [
          'c d   e g   f   o n', //
          'c d   f   e g   o n',
        ].map(split)

        expect(expected).toContainEqual(getPayloads(sequence))
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
        const expected = 'a b   i c d f g h j k l o    n'

        expect(getPayloads(sequence)).toEqual(split(expected))
      })
    })
  })
})

// split on whitespace
const split = (s: string) => s.split(/\s*/)
