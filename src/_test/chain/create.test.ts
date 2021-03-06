import { createChain, deserialize, getHead, getRoot, serialize } from '/chain'
import { setup } from '/test/util/setup'
import '/test/util/expect/toBeValid'
import { validate } from '/validator'

const { alice } = setup('alice')
const defaultUser = alice

const __ = expect.objectContaining

describe('chains', () => {
  test('create', () => {
    const chain = createChain({ user: defaultUser, name: 'a' })
    const expected = __({ body: __({ payload: __({ name: 'a' }) }) })
    expect(getRoot(chain)).toEqual(expected)
    expect(getHead(chain)[0]).toEqual(expected)
  })

  test('serialize/deserialize', () => {
    // 👨🏻‍🦲 Bob saves a chain to a file and loads it later
    const chain = createChain({ user: defaultUser, name: 'Spies Я Us' })

    // serialize
    const chainJson = serialize(chain)

    // deserialize
    const rehydratedChain = deserialize(chainJson)

    expect(validate(rehydratedChain)).toBeValid()
  })
})
