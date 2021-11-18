import { buildChain, findByPayload } from '../util/chain'
import { getRoot, getChildren } from '/chain'

describe('getChildren', () => {
  const chain = buildChain(`
                          ┌─ e ─ g ─┐
                ┌─ c ─ d ─┤         ├─ o ─┐
         a ─ b ─┤         └─── f ───┤     ├─ n
                ├──── h ──── i ─────┘     │ 
                └───── j ─── k ── l ──────┘           
      `)
  test('root has 1 child', () => expect(getChildren(chain, getRoot(chain))).toHaveLength(1))
  test('b has 3 children', () => expect(getChildren(chain, findByPayload(chain, 'b'))).toHaveLength(3))
  test('d has 2 children', () => expect(getChildren(chain, findByPayload(chain, 'd'))).toHaveLength(2))
  test('e has 1 child', () => expect(getChildren(chain, findByPayload(chain, 'e'))).toHaveLength(1))
  test('n has 0 children', () => expect(getChildren(chain, findByPayload(chain, 'n'))).toHaveLength(0))
})
