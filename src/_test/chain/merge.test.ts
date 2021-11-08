import clone from 'lodash/clone'
import { append, createChain, merge } from '/chain'
import '/test/util/expect/toBeValid'
import { setup } from '/test/util/setup'

const { alice, bob } = setup('alice', 'bob')
const defaultUser = alice
const __ = expect.objectContaining

describe('chains', () => {
  describe('merge', () => {
    test('no changes', () => {
      // 👩🏾 Alice creates a chain and shares it with Bob
      const aliceChain = createChain({ user: defaultUser, name: 'a' })
      const bobChain = clone(aliceChain)

      // 👩🏾👨🏻‍🦲 after a while they sync back up
      const aliceMerged = merge(aliceChain, bobChain)
      const bobMerged = merge(bobChain, aliceChain)

      // nothing has changed
      expect(aliceMerged).toEqual(aliceChain)
      expect(aliceMerged).toEqual(bobMerged)
      expect(bobMerged).toEqual(bobChain)
    })

    test('edits on one side', () => {
      // 👩🏾 Alice creates a chain and shares it with Bob
      const chain = createChain({ user: defaultUser, name: 'a' })
      const bobChain = clone(chain)

      // 👩🏾 Alice makes edits
      const aliceChain = append({ chain, action: { type: 'FOO', payload: 'doin stuff' }, user: alice })

      // 👨🏻‍🦲 Bob doesn't make any changes

      // 👩🏾👨🏻‍🦲 They sync back up
      const aliceMerged = merge(aliceChain, bobChain)
      const bobMerged = merge(bobChain, aliceChain)

      // They now have the same chain again
      expect(aliceMerged).toEqual(bobMerged)

      // Alice's chain didn't change
      expect(aliceMerged).toEqual(aliceChain)

      // Bob's chain did change
      expect(bobMerged).not.toEqual(bobChain)
    })

    test('concurrent edits', () => {
      // 👩🏾 Alice creates a chain and shares it with Bob
      const aliceChain = createChain({ user: alice, name: 'a' })
      const bobChain = { ...aliceChain }

      // 👩🏾 Alice makes changes while disconnected
      const aliceBranch1 = append({ chain: aliceChain, action: { type: 'FOO', payload: 'alice 1' }, user: alice })
      const aliceBranch2 = append({ chain: aliceBranch1, action: { type: 'FOO', payload: 'alice 2' }, user: alice })

      // 👨🏻‍🦲 Bob makes changes while disconnected
      const bobBranch = append({ chain: bobChain, action: { type: 'FOO', payload: 'bob' }, user: bob })

      // 👩🏾👨🏻‍🦲 They sync back up
      const aliceMerged = merge(aliceBranch2, bobBranch)
      const bobMerged = merge(bobBranch, aliceBranch2)

      // Both chains have changed
      expect(aliceMerged).not.toEqual(aliceBranch2)
      expect(bobMerged).not.toEqual(bobBranch)

      // but they're in sync with each other now
      expect(aliceMerged).toEqual(bobMerged)

      // The merged chains have 4 links: ROOT, bob's change, and alice's two changes
      expect(Object.keys(aliceMerged.links)).toHaveLength(4)
    })

    test(`can't merge chains with different roots`, () => {
      const aliceChain = createChain({ user: alice, name: 'a' })
      const bobChain = createChain({ user: bob, name: 'b' })

      // nope
      const tryToMerge = () => merge(aliceChain, bobChain)
      expect(tryToMerge).toThrow()
    })
  })
})
