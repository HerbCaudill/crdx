import { getRoot, getSuccessors, isSuccessor } from '/chain'
import { buildComplexChain, findByPayload, getPayloads } from '/test/chain/utils'

/*                          ┌─→ e ─→ g ─┐
         a ─→ b ─┬─→ c ─→ d ┴─→ f ───── * ── * ─→ o ── * ─→ n
                 ├─→ h ─→ i ─────────────────┘         │
                 └─→ j ─→ k ─→ l ──────────────────────┘           */

const chain = buildComplexChain()

describe('chains', () => {
  describe('successors', () => {
    describe('getSuccessors', () => {
      test('root', () => {
        const root = getRoot(chain)
        const successors = getPayloads(getSuccessors(chain, root)).sort()
        const expected = 'a b c d e f g h i j k l n o'.split(' ')
        expect(successors).toEqual(expected)
      })

      test('d', () => {
        const d = findByPayload(chain, 'd')
        const successors = getPayloads(getSuccessors(chain, d)).sort()
        expect(successors).toEqual('e f g n o'.split(' '))
      })

      test('o', () => {
        const o = findByPayload(chain, 'o')
        const successors = getPayloads(getSuccessors(chain, o)).sort()
        expect(successors).toEqual('n'.split(' '))
      })
    })

    describe('isSuccessor', () => {
      const testCase = (a: string, b: string) => {
        const aLink = findByPayload(chain, a)
        const bLink = findByPayload(chain, b)

        return isSuccessor(chain, aLink, bLink)
      }

      it('f succeeds c', () => expect(testCase('f', 'c')).toBe(true))
      it(`c doesn't succeed f`, () => expect(testCase('c', 'f')).toBe(false))
      it(`c doesn't succeed c`, () => expect(testCase('c', 'c')).toBe(false))
    })
  })
})
