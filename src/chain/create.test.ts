import { create, deserialize, getHead, getRoot, serialize, validate } from '@/chain'
import { setup } from '@/util/testing'

const { alice } = setup('alice')
const defaultUser = alice

import '@/util/testing/expect/toBeValid'

const __ = expect.objectContaining

describe('chains', () => {
  test('create', () => {
    const chain = create('a', defaultUser)
    expect(getRoot(chain)).toEqual(__({ body: __({ payload: 'a' }) }))
    expect(getHead(chain)).toEqual(__({ body: __({ payload: 'a' }) }))
  })

  test('persistence', () => {
    // 👨🏻‍🦲 Bob saves a chain to a file and loads it later
    const chain = create({ team: 'Spies Я Us' }, defaultUser)

    // serialize
    const chainJson = serialize(chain)

    // deserialize
    const rehydratedChain = deserialize(chainJson)

    expect(validate(rehydratedChain)).toBeValid()
  })
})
