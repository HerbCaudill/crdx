import { NetworkMessage, setupWithNetwork, TestUserStuff } from '../util/Network'
import { Action, append, createChain, SignatureChain } from '/chain'
import { generateMessage, initSyncState, receiveMessage, SyncPayload, SyncState } from '/sync'
import { createUser, User, UserWithSecrets } from '/user'
import { assert, truncateHashes } from '/util'

describe('sync', () => {
  describe('manual walkthrough', () => {
    it('Alice and Bob are already synced up', () => {
      // 👩🏾 Alice creates a chain
      const alice = createUser('alice')
      const chain = createChain<any>({ user: alice, name: 'test chain' })
      let aliceChain = append({ chain, action: { type: 'FOO' }, user: alice })
      let aliceSyncState = initSyncState()

      // 👨🏻‍🦲 Bob starts with an exact a copy of 👩🏾 Alice's chain
      const bob = createUser('bob')
      let bobChain = { ...aliceChain }
      let bobSyncState = initSyncState()

      let msg
      {
        // Neither 👩🏾 Alice nor 👨🏻‍🦲 Bob knows anything about the other's chain
        ;[aliceSyncState, msg] = generateMessage(aliceChain, aliceSyncState)
        assert(msg)
        ;[bobChain, bobSyncState] = receiveMessage(bobChain, bobSyncState, msg)

        // 👨🏻‍🦲 Bob is caught up, nothing to send
        ;[bobSyncState, msg] = generateMessage(bobChain, bobSyncState)
        expect(msg).toBeUndefined()
      }
    })

    it('Alice is ahead of Bob', () => {
      // 👩🏾 Alice creates a chain
      const alice = createUser('alice')
      const chain = createChain<any>({ user: alice, name: 'test chain' })

      // 👨🏻‍🦲 Bob has a copy of the original chain
      const bob = createUser('bob')
      let bobChain = { ...chain }
      let bobSyncState = initSyncState()

      // 👩🏾 Alice adds a link
      let aliceChain = append({ chain, action: { type: 'FOO' }, user: alice })
      let aliceSyncState = initSyncState()

      let msg
      {
        // Neither 👩🏾 Alice nor 👨🏻‍🦲 Bob knows anything about the other's chain
        ;[aliceSyncState, msg] = generateMessage(aliceChain, aliceSyncState)
        assert(msg)
        ;[bobChain, bobSyncState] = receiveMessage(bobChain, bobSyncState, msg)

        // 👨🏻‍🦲 Bob realizes he is missing a link, so he asks for it
        ;[bobSyncState, msg] = generateMessage(bobChain, bobSyncState)
        assert(msg)
        ;[aliceChain, aliceSyncState] = receiveMessage(aliceChain, aliceSyncState, msg)

        // 👩🏾 Alice provides the link 👨🏻‍🦲 Bob requested
        ;[aliceSyncState, msg] = generateMessage(aliceChain, aliceSyncState)
        assert(msg)
        ;[bobChain, bobSyncState] = receiveMessage(bobChain, bobSyncState, msg)

        // 👨🏻‍🦲 Bob is caught up, nothing to send
        ;[bobSyncState, msg] = generateMessage(bobChain, bobSyncState)
        expect(msg).toBeUndefined()
      }
    })

    it('Alice and Bob have diverged', () => {
      const alice = createUser('alice')
      const bob = createUser('bob')

      // 👩🏾 Alice creates a chain
      let aliceChain = createChain<any>({ user: alice, name: 'test chain' })
      let aliceSyncState = initSyncState()

      // 👨🏻‍🦲 Bob has a copy of the original chain
      let bobChain = { ...aliceChain }
      let bobSyncState = initSyncState()

      // 👩🏾 Alice adds a link
      aliceChain = append({ chain: aliceChain, action: { type: 'FOO' }, user: alice })

      // concurrently, 👨🏻‍🦲 Bob adds a link
      bobChain = append({ chain: bobChain, action: { type: 'BAR' }, user: bob })

      let msg
      {
        // Neither 👩🏾 Alice nor 👨🏻‍🦲 Bob knows anything about the other's chain
        ;[aliceSyncState, msg] = generateMessage(aliceChain, aliceSyncState)
        assert(msg)
        ;[bobChain, bobSyncState] = receiveMessage(bobChain, bobSyncState, msg)

        // 👨🏻‍🦲 Bob realizes he is missing a link, so he asks for it
        // 👨🏻‍🦲 Bob sees that Alice is missing one of his links, so he sends it
        ;[bobSyncState, msg] = generateMessage(bobChain, bobSyncState)
        assert(msg)
        ;[aliceChain, aliceSyncState] = receiveMessage(aliceChain, aliceSyncState, msg)

        // 👩🏾 Alice now has Bob's full chain, so she can merge with it
        // 👩🏾 Alice provides the link 👨🏻‍🦲 Bob requested, as well as the new merge link
        ;[aliceSyncState, msg] = generateMessage(aliceChain, aliceSyncState)
        assert(msg)
        ;[bobChain, bobSyncState] = receiveMessage(bobChain, bobSyncState, msg)

        // 👨🏻‍🦲 Bob is caught up, nothing to send
        ;[bobSyncState, msg] = generateMessage(bobChain, bobSyncState)
        expect(msg).toBeUndefined()
      }
    })
  })

  describe('with simulated network', () => {
    const N = 10 // "many"

    it('one change', () => {
      const [{ alice, bob }, network] = setupWithNetwork('alice', 'bob')
      network.connect(alice.peer, bob.peer)

      // no changes yet; 👩🏾 Alice and 👨🏻‍🦲 Bob are synced up
      expectToBeSynced(alice, bob)

      // 👩🏾 Alice makes a change; now they are out of sync
      alice.peer.chain = append({ chain: alice.peer.chain, action: { type: 'FOO' }, user: alice.user })
      expectNotToBeSynced(alice, bob)

      // 👩🏾 Alice exchanges sync messages with 👨🏻‍🦲 Bob
      alice.peer.sync()
      network.deliverAll()

      // Now they are synced up again
      expectToBeSynced(alice, bob)
    })

    it('many changes', () => {
      const [{ alice, bob }, network] = setupWithNetwork('alice', 'bob')
      network.connect(alice.peer, bob.peer)
      // no changes yet; 👩🏾 Alice and 👨🏻‍🦲 Bob are synced up
      expectToBeSynced(alice, bob)
      // 👩🏾 Alice makes many changes; now they are out of sync
      for (let i = 0; i < N; i++) {
        alice.peer.chain = append({ chain: alice.peer.chain, action: { type: 'FOO', payload: i }, user: alice.user })
      }
      expectNotToBeSynced(alice, bob)
      // 👩🏾 Alice exchanges sync messages with 👨🏻‍🦲 Bob
      alice.peer.sync()
      const msgs = network.deliverAll()
      expect(msgs.length).toBeLessThanOrEqual(5)
      expect(countLinks(msgs)).toEqual(N)
      // Now they are synced up again
      expectToBeSynced(alice, bob)
    })

    it('many changes followed by a single change', () => {
      const [{ alice, bob }, network] = setupWithNetwork('alice', 'bob')
      network.connect(alice.peer, bob.peer)

      // 👩🏾 Alice makes many changes
      for (let i = 0; i < N; i++) {
        alice.peer.chain = append({ chain: alice.peer.chain, action: { type: 'FOO', payload: i }, user: alice.user })
      }
      alice.peer.sync()
      const msgs1 = network.deliverAll()
      expect(countLinks(msgs1)).toEqual(10)

      // they're synced up again
      expectToBeSynced(alice, bob)

      // 👩🏾 Alice makes one more change
      alice.peer.chain = append({ chain: alice.peer.chain, action: { type: 'FOO', payload: 999 }, user: alice.user })
      alice.peer.sync()

      // make sure we didn't send more information that we had to
      const msgs2 = network.deliverAll()
      expect(countLinks(msgs2)).toEqual(1)
      expectToBeSynced(alice, bob)
    })

    it('concurrent changes', () => {
      const [{ alice, bob }, network] = setupWithNetwork('alice', 'bob')
      network.connect(alice.peer, bob.peer)

      // no changes yet; 👩🏾 Alice and 👨🏻‍🦲 Bob are synced up
      expectToBeSynced(alice, bob)

      // 👩🏾 Alice and 👨🏻‍🦲 Bob both make changes; now they are out of sync
      alice.peer.chain = append({ chain: alice.peer.chain, action: { type: 'FOO', payload: 999 }, user: alice.user })
      bob.peer.chain = append({ chain: bob.peer.chain, action: { type: 'PIZZA', payload: 42 }, user: bob.user })
      expectNotToBeSynced(alice, bob)

      // 👩🏾 Alice exchanges sync messages with 👨🏻‍🦲 Bob
      alice.peer.sync()
      bob.peer.sync()
      network.deliverAll()

      // Now they are synced up again
      expectToBeSynced(alice, bob)
    })

    it('many concurrent changes', () => {
      const [{ alice, bob }, network] = setupWithNetwork('alice', 'bob')
      network.connect(alice.peer, bob.peer)
      for (let i = 0; i < N; i++) {
        alice.peer.chain = append({ chain: alice.peer.chain, action: { type: 'FOO', payload: i }, user: alice.user })
      }
      alice.peer.sync()
      bob.peer.sync()
      network.deliverAll()

      // no changes yet; 👩🏾 Alice and 👨🏻‍🦲 Bob are synced up
      expectToBeSynced(alice, bob)

      // 👩🏾 Alice and 👨🏻‍🦲 Bob both make changes; now they are out of sync
      for (let i = 0; i < N; i++) {
        alice.peer.chain = append({ chain: alice.peer.chain, action: { type: 'BOO', payload: i }, user: alice.user })
        bob.peer.chain = append({ chain: bob.peer.chain, action: { type: 'PIZZA', payload: i }, user: bob.user })
      }
      expectNotToBeSynced(alice, bob)
      alice.peer.sync()
      bob.peer.sync()
      const msgs = network.deliverAll()

      // Links sent should be N +1 per peer
      expect(countLinks(msgs)).toEqual(2 * (N + 1))

      // Now they are synced up again
      expectToBeSynced(alice, bob)
    })

    // it.skip('with simulated false positives', async () => {
    //   const [{ alice, bob }, network] = setupWithNetwork('alice', 'bob')
    //   network.connect(alice.peer, bob.peer)
    //   // 👩🏾 Alice and 👨🏻‍🦲 Bob both make changes
    //   for (let i = 0; i < N; i++) {
    //     alice.team.addRole(`alice-${i}`)
    //     bob.team.addRole(`bob-${i}`)
    //   }
    //   expectNotToBeSynced(alice, bob)
    //   alice.peer.sync()
    //   bob.peer.sync()
    //   // Deliver messages but randomly omit some links
    //   const msgs = network.deliverAll(removeRandomLinks)
    //   // All links were eventually sent and none were repeated
    //   expect(countLinks(msgs)).toEqual(N + N + 1)
    //   // TODO: this is sending too many messages
    //   expect(msgs.length).toBeLessThanOrEqual(5)
    //   // We were still able to sync up
    //   expectToBeSynced(alice, bob)
    // })

    const expectToBeSynced = (a: TestUserStuff, b: TestUserStuff) => {
      expect(a.peer.chain.head).toEqual(b.peer.chain.head)
    }
    const expectNotToBeSynced = (a: TestUserStuff, b: TestUserStuff) => {
      expect(a.peer.chain.head).not.toEqual(b.peer.chain.head)
    }

    const countLinks = (messages: NetworkMessage[]) => {
      const linksInMessage = (message: NetworkMessage) =>
        message.body.links ? Object.keys(message.body.links).length : 0
      return messages.reduce((result, message) => result + linksInMessage(message), 0)
    }

    // this mutates a message containing multiple inks by removing one link
    // const removeRandomLinks: MessageMutator = msg => {
    //   const { links } = msg.body
    //   if (!links || Object.keys(links).length <= 3) return msg
    //   const hashes = Object.keys(links)
    //   const modifiedLinks = hashes.reduce((result, hash) => {
    //     return Math.random() < 0.1
    //       ? result
    //       : {
    //           ...result,
    //           [hash]: links[hash],
    //         }
    //   }, {})
    //   return {
    //     ...msg,
    //     body: {
    //       ...msg.body,
    //       links: modifiedLinks,
    //     },
    //   }
    // }
  })
})
