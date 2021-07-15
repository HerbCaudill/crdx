import { createChain, deserialize, getHead, getRoot, serialize } from '@/chain'
import { setup } from '@/test/util/setup'
import '@/test/util/expect/toBeValid'
import { validate } from '@/validator'

const { alice } = setup('alice')
const defaultUser = alice

const __ = expect.objectContaining

describe('chains', () => {
  test('create', () => {
    const chain = createChain({ name: 'a' }, defaultUser)
    const expected = __({ body: __({ payload: __({ name: 'a' }) }) })
    expect(getRoot(chain)).toEqual(expected)
    expect(getHead(chain)).toEqual(expected)
  })

  test('serialize/deserialize', () => {
    // 👨🏻‍🦲 Bob saves a chain to a file and loads it later
    const chain = createChain({ name: 'Spies Я Us' }, defaultUser)

    // serialize
    const chainJson = serialize(chain)

    // deserialize
    const rehydratedChain = deserialize(chainJson)

    expect(validate(rehydratedChain)).toBeValid()
  })
})
