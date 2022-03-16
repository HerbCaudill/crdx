import { asymmetric } from '@herbcaudill/crypto'
import { buildChain } from '/test/util/chain'
import { append, createChain, getHead, getLink, getRoot } from '/chain'
import { hashLink } from '/chain/hashLink'
import '/test/util/expect/toBeValid'
import { setup, TEST_CHAIN_KEYS as chainKeys } from '/test/util/setup'

import { jest } from '@jest/globals'
import { validate } from '/validator/validate'

const { alice, eve } = setup('alice', 'eve')
const { setSystemTime } = jest.useFakeTimers()

describe('chains', () => {
  describe('validation', () => {
    describe('valid chains', () => {
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

    describe('invalid chains', () => {
      const setupChain = () => {
        const chain = buildChain(`
                             ┌─ e ─ g ─┐
                   ┌─ c ─ d ─┤         ├─ o ─┐
            a ─ b ─┤         └─── f ───┤     ├─ n
                   ├──── h ──── i ─────┘     │ 
                   └───── j ─── k ── l ──────┘           
      `)
        expect(validate(chain)).toBeValid()
        return chain
      }

      test('The ROOT link cannot have any predecessors ', () => {
        const chain = setupChain()
        const rootLink = getRoot(chain)

        rootLink.body.prev = chain.head
        expect(validate(chain)).not.toBeValid(`ROOT link cannot have any predecessors`)
      })

      test('The ROOT link has to be the link referenced by the chain `root` property', () => {
        const chain = setupChain()
        chain.root = chain.head[0]
        expect(validate(chain)).not.toBeValid('ROOT link has to be the link referenced by the chain `root` property')
      })

      test('Non-ROOT links must have predecessors', () => {
        const chain = setupChain()
        const nonRootLink = getHead(chain)[0]
        nonRootLink.body.prev = []
        expect(validate(chain)).not.toBeValid('Non-ROOT links must have predecessors')
      })

      test('The link referenced by the chain `root` property must be a ROOT link', () => {
        const chain = setupChain()
        const rootLink = getRoot(chain)
        rootLink.body.type = 'FOO'
        rootLink.body.prev = chain.head
        expect(validate(chain)).not.toBeValid('The link referenced by the chain `root` property must be a ROOT link')
      })

      test(`Eve tampers with the root`, () => {
        const chain = setupChain()

        // 🦹‍♀️ Eve tampers with the root
        const rootLink = getRoot(chain)
        rootLink.body.user.userName = 'Eve'

        // 🦹‍♀️ She reencrypts the link with her private key
        chain.encryptedLinks[chain.root] = {
          encryptedBody: asymmetric.encrypt({
            secret: rootLink.body,
            recipientPublicKey: chainKeys.encryption.publicKey,
            senderSecretKey: eve.keys.encryption.secretKey,
          }),
          authorPublicKey: eve.keys.encryption.publicKey,
        }

        // 👩🏾 Alice is not fooled, because the root hash no longer matches the computed hash of the root link
        expect(validate(chain)).not.toBeValid('Root hash does not match')
      })

      test(`Eve tampers with the root and also changes the root hash`, () => {
        const chain = setupChain()

        // 🦹‍♀️ Eve tampers with the root
        const rootLink = getRoot(chain)
        rootLink.body.user = eve

        const oldRootHash = chain.root

        // 🦹‍♀️ She reencrypts the link with her private key
        const encryptedBody = asymmetric.encrypt({
          secret: rootLink.body,
          recipientPublicKey: chainKeys.encryption.publicKey,
          senderSecretKey: eve.keys.encryption.secretKey,
        })

        // 🦹‍♀️ She removes the old root
        delete chain.links[oldRootHash]
        delete chain.encryptedLinks[oldRootHash] // these links would resurface when syncing later anyway, because other people still have them

        // 🦹‍♀️ She generates a new root hash
        const newRootHash = hashLink(encryptedBody)
        chain.root = newRootHash // this would also prevent syncing in the future, since two chains with different roots can't sync

        // 🦹‍♀️  She adds the tampered root
        chain.encryptedLinks[newRootHash] = {
          encryptedBody,
          authorPublicKey: eve.keys.encryption.publicKey,
        }
        chain.links[newRootHash] = rootLink

        // 👩🏾 Alice is not fooled, because the next link after the root now has the wrong hash
        expect(validate(chain)).not.toBeValid(
          'link referenced by one of the hashes in the `prev` property does not exist.'
        )
      })

      test(`Eve tampers with the head`, () => {
        const chain = setupChain()

        // 🦹‍♀️ Eve tampers with the head
        const headHash = chain.head[0]
        const headLink = getLink(chain, headHash)
        headLink.body.user.userName = 'Eve'

        // 🦹‍♀️ She reencrypts the link with her private key
        chain.encryptedLinks[headHash] = {
          encryptedBody: asymmetric.encrypt({
            secret: headLink.body,
            recipientPublicKey: chainKeys.encryption.publicKey,
            senderSecretKey: eve.keys.encryption.secretKey,
          }),
          authorPublicKey: eve.keys.encryption.publicKey,
        }

        // 👩🏾 Alice is not fooled, because the head hash no longer matches the computed hash of the head link
        expect(validate(chain)).not.toBeValid('Head hash does not match')
      })

      test(`Eve tampers with an arbitrary link`, () => {
        const chain = setupChain()

        // 🦹‍♀️ Eve tampers with a link
        const linkHash = Object.keys(chain.links)[2]
        const link = getLink(chain, linkHash)

        link.body.payload = 'foo'

        // 🦹‍♀️ She reencrypts the link with her private key
        chain.encryptedLinks[linkHash] = {
          encryptedBody: asymmetric.encrypt({
            secret: link.body,
            recipientPublicKey: chainKeys.encryption.publicKey,
            senderSecretKey: eve.keys.encryption.secretKey,
          }),
          authorPublicKey: eve.keys.encryption.publicKey,
        }

        // 👩🏾 Alice is not fooled, because the link's hash no longer matches the computed hash of the head link
        expect(validate(chain)).not.toBeValid('hash calculated for this link does not match')
      })

      test(`timestamp out of order`, () => {
        const IN_THE_PAST = new Date('2020-01-01').getTime()
        const chain = setupChain()

        // 🦹‍♀️ Eve sets her system clock back when appending a link
        const now = Date.now()
        setSystemTime(IN_THE_PAST)
        const chain2 = append({ chain, action: { type: 'FOO', payload: 'pizza' }, user: eve, chainKeys })
        setSystemTime(now)

        expect(validate(chain2)).not.toBeValid(`timestamp can't be earlier than a previous link`)
      })

      test(`timestamp in the future`, () => {
        const IN_THE_FUTURE = new Date(`10000-01-01`).getTime() // NOTE: test will begin to fail 7,978 years from now
        const chain = setupChain()

        // 🦹‍♀️ Eve sets her system clock forward when appending a link
        const now = Date.now()
        setSystemTime(IN_THE_FUTURE)
        const chain2 = append({ chain, action: { type: 'FOO', payload: 'pizza' }, user: eve, chainKeys })
        setSystemTime(now)

        expect(validate(chain2)).not.toBeValid(`timestamp is in the future`)
      })
    })
  })
})
