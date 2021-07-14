import {
  Action,
  append,
  arbitraryDeterministicSort,
  baseResolver,
  create,
  getSequence,
  NonMergeLink,
  Resolver,
  Sequence,
  Sequencer,
} from '@/chain'
import { buildChain, findByPayload, getPayloads } from '@/test/chain/utils'
import { setup } from '@/test/util/setup'
import { randomKey } from '@herbcaudill/crypto'

const { alice } = setup('alice')

const randomSequencer: Sequencer<any> = (a, b) => {
  // change the hash key on each run, to ensure our tests aren't bound to one arbitrary sort
  const hashKey = randomKey()
  const [_a, _b] = [a, b].sort(arbitraryDeterministicSort(hashKey))
  return _a.concat(_b)
}

const sequencer = randomSequencer

describe('chains', () => {
  describe('getSequence', () => {
    test('upon creation', () => {
      var chain = create({ name: 'root' }, alice)
      chain = append(chain, { type: 'X', payload: 'a' }, alice)
      const sequence = getSequence({ chain, sequencer })
      expect(getPayloads(sequence)).toEqual(['a'])
    })

    test('no branches', () => {
      var chain = create({ name: 'root' }, alice)
      chain = append(chain, { type: 'X', payload: 'a' }, alice)
      chain = append(chain, { type: 'X', payload: 'b' }, alice)
      chain = append(chain, { type: 'X', payload: 'c' }, alice)
      const sequence = getSequence({ chain, sequencer })

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
        const sequence = getSequence({ chain, sequencer })

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
        const sequence = getSequence<any>({ chain, root: b, sequencer })

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
        const sequence = getSequence<any>({ chain, head: d, sequencer })

        const expected = 'a b c d'

        expect(getPayloads(sequence)).toEqual(split(expected))
      })

      test('root & head', () => {
        const j = findByPayload(chain, 'j')
        const l = findByPayload(chain, 'l')
        const sequence = getSequence<any>({ chain, root: j, head: l, sequencer })

        const expected = 'j k l'

        expect(getPayloads(sequence)).toEqual(split(expected))
      })

      test('root within a branch', () => {
        const c = findByPayload(chain, 'c')
        const sequence = getSequence<any>({ chain, root: c, sequencer })

        const expected = [
          'c d   e g   f   o n', //
          'c d   f   e g   o n',
        ].map(split)

        expect(expected).toContainEqual(getPayloads(sequence))
      })

      test('custom sequencer', () => {
        // sequence rules: `i`s go first, otherwise alphabetical
        const sequencer: Sequencer<XAction> = (a, b) => {
          const alpha = (a: XLink, b: XLink) => (a.body.payload > b.body.payload ? 1 : -1)
          const merged: Sequence<XAction> = a.concat(b).sort(alpha)

          const isI = (n: XLink) => n.body.payload === 'i'
          const Is = merged.filter(n => isI(n))
          const notIs = merged.filter(n => !isI(n))

          return Is.concat(notIs)
        }

        // inclusion rules: `e`s are omitted
        const resolver: Resolver = ([a, b], chain) => {
          const [_a, _b] = baseResolver([a, b], chain)

          const eFilter = (n: XLink) => n.body.payload !== 'e'
          return [_a.filter(eFilter), _b.filter(eFilter)]
        }

        const sequence = getSequence({ chain, sequencer, resolver })

        // note that `i` comes first in the merged portion, and `e` is omitted
        const expected = 'a b   i c d f g h j k l o    n'

        expect(getPayloads(sequence)).toEqual(split(expected))
      })
    })
  })
})

// split on whitespace
const split = (s: string) => s.split(/\s*/)

interface XAction extends Action {
  type: 'X'
  payload: string
}
type XLink = NonMergeLink<XAction>
