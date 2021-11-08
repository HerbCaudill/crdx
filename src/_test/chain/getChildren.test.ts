import { buildChain, findByPayload } from './utils'
import { getChildren } from '/chain/getChildren'

describe('getChildren', () => {
  const chain = buildChain(`
                          ┌─ e ─ g ─┐
                ┌─ c ─ d ─┤         ├─ o ─┐
         a ─ b ─┤         └─── f ───┤     ├─ n
                ├──── h ──── i ─────┘     │ 
                └───── j ─── k ── l ──────┘           
      `)
  test('root has 1 child', () => expect(getChildren(chain, chain.root)).toHaveLength(1))
  test('b has 3 children', () => expect(getChildren(chain, findByPayload(chain, 'b').hash)).toHaveLength(3))
  test('d has 2 children', () => expect(getChildren(chain, findByPayload(chain, 'd').hash)).toHaveLength(2))
  test('e has 1 child', () => expect(getChildren(chain, findByPayload(chain, 'e').hash)).toHaveLength(1))
  test('n has 0 children', () => expect(getChildren(chain, findByPayload(chain, 'n').hash)).toHaveLength(0))
})
