import { getCommonPredecessor, getHead, getParents, getPredecessors, isPredecessor } from '/chain'
import { buildChain, byPayload, findByPayload, getPayloads } from '../util/chain'

describe('chains', () => {
  describe('predecessors', () => {
    const chain = buildChain(`
                          ┌─ e ─ g ─┐
                ┌─ c ─ d ─┤         ├─ o ─┐
         a ─ b ─┤         └─── f ───┤     ├─ n
                ├──── h ──── i ─────┘     │ 
                └───── j ─── k ── l ──────┘           
      `)

    describe('getParents', () => {
      const testCase = (payload: string) => {
        const link = findByPayload(chain, payload)
        const result = getParents(chain, link)
        return result.map(l => l.body.payload).join('')
      }

      test('b', () => expect(testCase('b')).toBe('a'))
    })

    describe('getPredecessors', () => {
      test('head', () => {
        const predecessors = getPayloads(getPredecessors(chain, getHead(chain)[0]))
          .split('')
          .sort()
          .join('') // ignore order
        expect(predecessors).toEqual('abcdefghijklo')
      })

      test('d', () => {
        const d = findByPayload(chain, 'd')
        const predecessors = getPayloads(getPredecessors(chain, d))
        expect(predecessors).toEqual('cba') // note correct order
      })

      test('o', () => {
        const o = findByPayload(chain, 'o')
        const predecessors = getPayloads(getPredecessors(chain, o)).split('').sort().join('') // ignore order
        expect(predecessors).toEqual('abcdefghi')
      })
    })

    describe('isPredecessor', () => {
      const testCase = (a: string, b: string) => {
        const aLink = findByPayload(chain, a)
        const bLink = findByPayload(chain, b)

        return isPredecessor(chain, aLink, bLink)
      }

      test('c precedes f', () => expect(testCase('c', 'f')).toBe(true))
      test('c precedes d', () => expect(testCase('c', 'd')).toBe(true))
      test('c precedes n', () => expect(testCase('c', 'n')).toBe(true))
      test('a precedes n', () => expect(testCase('a', 'n')).toBe(true))

      test(`f doesn't precede c`, () => expect(testCase('f', 'c')).toBe(false))
      test(`n doesn't precede a`, () => expect(testCase('n', 'a')).toBe(false))
      test(`c doesn't precede c`, () => expect(testCase('c', 'c')).toBe(false))
      test(`c doesn't precede h`, () => expect(testCase('c', 'h')).toBe(false))
      test(`c doesn't precede l`, () => expect(testCase('c', 'l')).toBe(false))

      test(`nonexistent nodes don't precede anything`, () => expect(testCase('nope', 'c')).toBe(false))
    })

    describe('getCommonPredecessor', () => {
      const testCase = (a: string, b: string) => {
        const aLink = findByPayload(chain, a)
        const bLink = findByPayload(chain, b)
        const result = getCommonPredecessor(chain, [aLink, bLink])
        return result.body.payload
      }

      test('f g', () => expect(testCase('a', 'b')).toBe('a'))
      test('f g', () => expect(testCase('b', 'a')).toBe('a'))
      test('f g', () => expect(testCase('f', 'g')).toBe('d'))
      test('l o', () => expect(testCase('l', 'o')).toBe('b'))
      test('f f', () => expect(testCase('f', 'f')).toBe('f'))
      test('d f', () => expect(testCase('d', 'f')).toBe('d'))
      test('k l', () => expect(testCase('k', 'n')).toBe('k'))

      test('require two links', () => {
        const a = findByPayload(chain, 'a')
        expect(() => getCommonPredecessor(chain, [a])).toThrow()
      })
    })
  })
})
