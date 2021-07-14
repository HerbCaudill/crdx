import { append, create } from '@/chain'
import { getHead } from '@/chain/getHead'
import { getRoot } from '@/chain/getRoot'
import { setup } from '@/test/util/setup'
import '@/test/util/expect/toBeValid'

const { alice } = setup('alice')
const defaultUser = alice

const __ = expect.objectContaining

describe('chains', () => {
  test('append', () => {
    const chain1 = create({ name: 'a' }, defaultUser)
    const chain2 = append(chain1, { type: 'FOO', payload: 'b' }, defaultUser)
    expect(getRoot(chain2)).toEqual(__({ body: __({ payload: __({ name: 'a' }) }) }))
    expect(getHead(chain2)).toEqual(__({ body: __({ payload: 'b' }) }))
  })
})