import { append, createChain } from '/chain'
import { getHead } from '/chain/getHead'
import { getRoot } from '/chain/getRoot'
import { setup } from '/test/util/setup'
import '/test/util/expect/toBeValid'

const { alice } = setup('alice')
const defaultUser = alice

const __ = expect.objectContaining

describe('chains', () => {
  test('append', () => {
    const chain1 = createChain({ user: defaultUser, name: 'a' })
    const chain2 = append({ chain: chain1, action: { type: 'FOO', payload: 'b' }, user: defaultUser })
    expect(getRoot(chain2)).toEqual(__({ body: __({ payload: __({ name: 'a' }) }) }))
    expect(getHead(chain2)).toEqual([__({ body: __({ payload: 'b' }) })])
  })
})
