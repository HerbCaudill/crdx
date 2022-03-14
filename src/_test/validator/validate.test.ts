import { append, createChain } from '/chain'
import '/test/util/expect/toBeValid'
import { setup, TEST_CHAIN_KEYS as chainKeys } from '/test/util/setup'
import { validate } from '/validator/validate'

const { alice } = setup('alice')

describe('chains', () => {
  describe('validation', () => {
    test(`new chain`, () => {
      const chain = createChain({ user: alice, name: 'Spies Я Us', chainKeys })
      expect(validate(chain)).toBeValid()
    })

    test(`new chain with one additional link`, () => {
      const chain = createChain({ user: alice, name: 'Spies Я Us', chainKeys })
      const newLink = { type: 'FOO', payload: { name: 'charlie' } }
      const newChain = append({ chain, action: newLink, user: alice, chainKeys })
      expect(validate(newChain)).toBeValid()
    })
  })
})
