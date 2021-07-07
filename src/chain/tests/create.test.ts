import { create, deserialize, getHead, getRoot, serialize, validate } from '@/chain'
import { setup } from '@/util/testing'
import '@/util/testing/expect/toBeValid'

const { alice } = setup('alice')
const defaultUser = alice

const __ = expect.objectContaining

describe('chains', () => {
  test('create', () => {
    const chain = create({ name: 'a' }, defaultUser)
    const expected = __({ body: __({ payload: __({ name: 'a' }) }) })
    expect(getRoot(chain)).toEqual(expected)
    expect(getHead(chain)).toEqual(expected)
  })

  test('serialize/deserialize', () => {
    // 👨🏻‍🦲 Bob saves a chain to a file and loads it later
    const chain = create({ name: 'Spies Я Us' }, defaultUser)

    // serialize
    const chainJson = serialize(chain)

    // deserialize
    const rehydratedChain = deserialize(chainJson)

    expect(validate(rehydratedChain)).toBeValid()
  })
})
