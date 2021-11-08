import { getRoot, getSuccessors, isSuccessor } from '/chain'
import { buildChain, findByPayload, getPayloads, XLink } from '/test/chain/utils'

describe('chains', () => {
  describe('successors', () => {
    const chain = buildChain(`
                         ┌─ e ─ g ─┐
               ┌─ c ─ d ─┤         ├─ o ─┐
        a ─ b ─┤         └─── f ───┤     ├─ n
               ├──── h ──── i ─────┘     │ 
               └───── j ─── k ── l ──────┘           
    `)

    describe('getSuccessors', () => {
      const getSuccessorPayloads = (link: XLink): string => {
        const successors = getSuccessors(chain, link)
        return getPayloads(successors)
          .split('')
          .sort()
          .join('')
      }

      test('root', () => {
        const root = getRoot(chain)
        expect(getSuccessorPayloads(root)).toEqual('abcdefghijklno')
      })

      test('d', () => {
        const d = findByPayload(chain, 'd')
        expect(getSuccessorPayloads(d)).toEqual('efgno')
      })

      test('o', () => {
        const o = findByPayload(chain, 'o')
        expect(getSuccessorPayloads(o)).toEqual('n')
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
