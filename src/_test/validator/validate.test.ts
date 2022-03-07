import { signatures } from '@herbcaudill/crypto'
import { buildChain, findByPayload } from '../util/chain'
import { append, createChain, getRoot } from '/chain'
import { hashLink } from '/chain/hashLink'
import { ROOT } from '/constants'
import '/test/util/expect/toBeValid'
import { setup, TEST_CHAIN_KEYS as chainKeys } from '/test/util/setup'
import { assertIsValid, validate } from '/validator/validate'

const __ = expect.objectContaining

const { alice } = setup('alice')

describe('chains', () => {
  // TODO: These tests now need to make sure that Eve can't modify a plaintext link because it will
  // no longer match the encrypted link
  describe.skip('validation', () => {
    test(`Bob validates Alice's new chain`, () => {
      // 👩🏾 Alice
      const chain = createChain({ user: alice, name: 'Spies Я Us', chainKeys })

      // 👨🏻‍🦲 Bob
      expect(validate(chain)).toBeValid()
    })

    test(`Bob validates Alice's chain with a couple of links`, () => {
      // 👩🏾 Alice
      const chain = createChain({ user: alice, name: 'Spies Я Us', chainKeys })
      const newLink = { type: 'add-user', payload: { name: 'charlie' } }
      const newChain = append({ chain, action: newLink, user: alice, chainKeys })

      // 👨🏻‍🦲 Bob
      expect(validate(newChain)).toBeValid()
    })

    test('Mallory tampers with the payload; Bob is not fooled', () => {
      // 👩🏾 Alice
      const chain = createChain({ user: alice, name: 'Spies Я Us', chainKeys })

      // 🦹‍♂️ Mallory
      const payload = getRoot(chain).body.payload
      payload.name = payload.name.replace('Spies', 'Dorks')

      // 👨🏻‍🦲 Bob is not fooled because the link's hash is no longer correct
      expect(validate(chain)).not.toBeValid()
      expect(() => assertIsValid(chain)).toThrow()
    })

    test('Mallory removes a link from the chain; Bob is not fooled', () => {
      // 👩🏾 Alice
      const chain = buildChain(`
                          ┌─ e ─ g ─┐
                ┌─ c ─ d ─┤         ├─ o ─┐
         a ─ b ─┤         └─── f ───┤     ├─ n
                ├──── h ──── i ─────┘     │ 
                └───── j ─── k ── l ──────┘           
      `)

      // 🦹‍♂️ Mallory
      const h = findByPayload(chain, 'h')
      delete chain.links[h.hash]

      // 👨🏻‍🦲 Bob is not fooled because there are links that depended on that link
      expect(validate(chain)).not.toBeValid()
    })

    test.skip('Mallory tampers with the payload and even updates the hash; Bob is still not fooled', () => {
      // 👩🏾 Alice
      const chain = createChain({ user: alice, name: 'Spies Я Us', chainKeys })

      // 🦹‍♂️ Mallory
      const root = getRoot(chain)

      const payload = root.body.payload
      payload.name = payload.name.replace('Spies', 'Dorks')

      // Mallory covers her tracks by recalculating the hash
      const hash = hashLink(root.body)
      root.hash = hash
      chain.head = [hash]
      chain.root = hash
      chain.links = { [hash]: root }

      // 👨🏻‍🦲 Bob is not fooled because the signature doesn't validate
      expect(validate(chain)).not.toBeValid()
    })

    test('Alice, for reasons only she understands, munges the type of the first link; validation fails', () => {
      // 👩🏾 Alice
      const chain = createChain({ user: alice, name: 'Spies Я Us', chainKeys })

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
      const chain = createChain({ user: alice, name: 'Spies Я Us', chainKeys })

      const link = {
        type: ROOT,
        payload: { foo: 'pizza' },
      }

      // add it to an empty chain
      const newChain = append({ chain, action: link, user: alice, chainKeys })

      // nope
      expect(validate(newChain)).not.toBeValid()
    })
  })
})
