import { append, createChain } from '/chain'
import { getRoot } from '/chain/getRoot'
import { validate } from '/validator/validate'
import { setup } from '/test/util/setup'
import { signatures } from '@herbcaudill/crypto'

import '/test/util/expect/toBeValid'
import { ROOT } from '/constants'

const __ = expect.objectContaining

const { alice } = setup('alice')

describe('chains', () => {
  describe('validation', () => {
    test(`Bob validates Alice's new chain`, () => {
      // 👩🏾 Alice
      const chain = createChain({ user: alice, name: 'Spies Я Us', id: 'e2A3ps5uaG68IA2kZu5HsR6A' })

      // 👨🏻‍🦲 Bob
      expect(validate(chain)).toBeValid()
    })

    test(`Bob validates Alice's chain with a couple of links`, () => {
      // 👩🏾 Alice
      const chain = createChain({ user: alice, name: 'Spies Я Us', id: 'e2A3ps5uaG68IA2kZu5HsR6A' })
      const newLink = { type: 'add-user', payload: { name: 'charlie' } }
      const newChain = append(chain, newLink, alice)

      // 👨🏻‍🦲 Bob
      const isValid = validate(newChain)
      expect(isValid).toBeValid()
    })

    test('Mallory tampers with the payload; Bob is not fooled', () => {
      // 👩🏾 Alice
      const chain = createChain({ user: alice, name: 'Spies Я Us', id: 'e2A3ps5uaG68IA2kZu5HsR6A' })

      // 🦹‍♂️ Mallory
      const payload = getRoot(chain).body.payload
      payload.name = payload.name.replace('Spies', 'Dorks')

      // 👨🏻‍🦲 Bob
      expect(validate(chain)).not.toBeValid()
    })

    test('Alice, for reasons only she understands, munges the type of the first link; validation fails', () => {
      // 👩🏾 Alice
      const chain = createChain({ user: alice, name: 'Spies Я Us', id: 'e2A3ps5uaG68IA2kZu5HsR6A' })

      const root = getRoot(chain)
      // @ts-ignore
      root.body.type = 'IS_IT_SPELLED_ROOT_OR_ROUTE_OR_REWT'

      // she re-signs the messed-up link because she wants to see the world burn
      const { secretKey, publicKey } = alice.keys.signature
      const signature = signatures.sign(root.body, secretKey)

      chain.links[chain.root] = {
        ...root,
        signed: {
          userName: alice.userName,
          signature,
          key: publicKey,
        },
      }

      // 👨🏻‍🦲 Bob
      expect(validate(chain)).not.toBeValid()
    })

    test('Alice gets high and tries to add another ROOT link', () => {
      // 👩🏾 Alice
      const chain = createChain({ user: alice, name: 'Spies Я Us', id: 'e2A3ps5uaG68IA2kZu5HsR6A' })

      const link = {
        type: ROOT,
        payload: { foo: 'pizza' },
      }

      // add it to an empty chain
      const newChain = append(chain, link, alice)

      // nope
      expect(validate(newChain)).not.toBeValid()
    })
  })
})
