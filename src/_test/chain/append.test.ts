import { append, createChain, getHead, getRoot } from '/chain'
import { CHAIN, createKeyset } from '/keyset'
import '/test/util/expect/toBeValid'
import { setup } from '/test/util/setup'
import { validate } from '/validator'

const { alice } = setup('alice')
const defaultUser = alice

import { TEST_CHAIN_KEYS as chainKeys } from '/test/util/setup'

const __ = expect.objectContaining

describe('chains', () => {
  test('append', () => {
    const chain1 = createChain({ user: defaultUser, name: 'a', chainKeys })
    const chain2 = append({ chain: chain1, action: { type: 'FOO', payload: 'b' }, user: defaultUser, chainKeys })

    expect(validate(chain2)).toBeValid()

    expect(getRoot(chain2)).toEqual(__({ body: __({ payload: __({ name: 'a' }) }) }))
    expect(getHead(chain2)).toEqual([__({ body: __({ payload: 'b' }) })])
  })
})
