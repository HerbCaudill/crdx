import { Network, setupWithNetwork, TestUserStuff } from '../util/Network'
import { append, createChain, headsAreEqual } from '/chain'
import { generateMessage, initSyncState, receiveMessage } from '/sync'
import { createUser } from '/user'
import { assert } from '/util'

describe('sync', () => {
  describe('manual walkthrough', () => {
    it('Alice and Bob are already synced up', () => {
      // đ©đŸ Alice creates a chain
      const alice = createUser('alice')
      const chain = createChain<any>({ user: alice, name: 'test chain' })
      let aliceChain = append({ chain, action: { type: 'FOO' }, user: alice })
      let aliceSyncState = initSyncState()

      // đšđ»âđŠČ Bob starts with an exact a copy of đ©đŸ Alice's chain
      let bobChain = { ...aliceChain }
      let bobSyncState = initSyncState()

      let msg
        // Neither đ©đŸ Alice nor đšđ»âđŠČ Bob knows anything about the other's chain
      ;[aliceSyncState, msg] = generateMessage(aliceChain, aliceSyncState)
      assert(msg)
      ;[bobChain, bobSyncState] = receiveMessage(bobChain, bobSyncState, msg)

      // đšđ»âđŠČ Bob is caught up, so he lets Alice know
      ;[bobSyncState, msg] = generateMessage(bobChain, bobSyncState)
      assert(msg)
      ;[aliceChain, aliceSyncState] = receiveMessage(aliceChain, aliceSyncState, msg)

      // đ©đŸ Alice is caught up, so she lets Bob know
      ;[aliceSyncState, msg] = generateMessage(aliceChain, aliceSyncState)
      assert(msg)
      ;[bobChain, bobSyncState] = receiveMessage(bobChain, bobSyncState, msg)

      // Neither one has anything further to say
      ;[bobSyncState, msg] = generateMessage(bobChain, bobSyncState)
      expect(msg).toBeUndefined()
      ;[aliceSyncState, msg] = generateMessage(aliceChain, aliceSyncState)
      expect(msg).toBeUndefined()
    })

    it('Alice is ahead of Bob', () => {
      // đ©đŸ Alice creates a chain
      const alice = createUser('alice')
      const chain = createChain<any>({ user: alice, name: 'test chain' })

      // đšđ»âđŠČ Bob has a copy of the original chain
      let bobChain = { ...chain }
      let bobSyncState = initSyncState()

      // đ©đŸ Alice adds a link
      let aliceChain = append({ chain, action: { type: 'FOO' }, user: alice })
      let aliceSyncState = initSyncState()

      let msg

        // Neither đ©đŸ Alice nor đšđ»âđŠČ Bob knows anything about the other's chain
      ;[aliceSyncState, msg] = generateMessage(aliceChain, aliceSyncState)
      assert(msg)
      ;[bobChain, bobSyncState] = receiveMessage(bobChain, bobSyncState, msg)

      // đšđ»âđŠČ Bob realizes he is missing a link, so he asks for it
      ;[bobSyncState, msg] = generateMessage(bobChain, bobSyncState)
      assert(msg)
      ;[aliceChain, aliceSyncState] = receiveMessage(aliceChain, aliceSyncState, msg)

      // đ©đŸ Alice provides the link đšđ»âđŠČ Bob requested
      ;[aliceSyncState, msg] = generateMessage(aliceChain, aliceSyncState)
      assert(msg)
      ;[bobChain, bobSyncState] = receiveMessage(bobChain, bobSyncState, msg)

      // đšđ»âđŠČ Bob is caught up, so he lets Alice know
      ;[bobSyncState, msg] = generateMessage(bobChain, bobSyncState)
      assert(msg)
      ;[aliceChain, aliceSyncState] = receiveMessage(aliceChain, aliceSyncState, msg)

      // đ©đŸ Alice is caught up, so she lets Bob know
      ;[aliceSyncState, msg] = generateMessage(aliceChain, aliceSyncState)
      assert(msg)
      ;[bobChain, bobSyncState] = receiveMessage(bobChain, bobSyncState, msg)

      // Neither one has anything further to say
      ;[bobSyncState, msg] = generateMessage(bobChain, bobSyncState)
      expect(msg).toBeUndefined()
      ;[aliceSyncState, msg] = generateMessage(aliceChain, aliceSyncState)
      expect(msg).toBeUndefined()

      // Bob knows that he is caught up with Alice
      expect(headsAreEqual(bobSyncState.theirHead, aliceChain.head)).toBe(true)
      // Alice knows that Bob is caught up with her
      expect(headsAreEqual(aliceSyncState.theirHead, bobChain.head)).toBe(true)
    })

    it('Alice and Bob have diverged', () => {
      const alice = createUser('alice')
      const bob = createUser('bob')

      // đ©đŸ Alice creates a chain
      let aliceChain = createChain<any>({ user: alice, name: 'test chain' })
      let aliceSyncState = initSyncState()

      // đšđ»âđŠČ Bob has a copy of the original chain
      let bobChain = { ...aliceChain }
      let bobSyncState = initSyncState()

      // đ©đŸ Alice adds a link
      aliceChain = append({ chain: aliceChain, action: { type: 'FOO' }, user: alice })

      // concurrently, đšđ»âđŠČ Bob adds a link
      bobChain = append({ chain: bobChain, action: { type: 'BAR' }, user: bob })

      let msg
        // Neither đ©đŸ Alice nor đšđ»âđŠČ Bob knows anything about the other's chain
      ;[aliceSyncState, msg] = generateMessage(aliceChain, aliceSyncState)
      assert(msg)
      ;[bobChain, bobSyncState] = receiveMessage(bobChain, bobSyncState, msg)

      // đšđ»âđŠČ Bob realizes he is missing a link, so he asks for it
      // đšđ»âđŠČ Bob sees that Alice is missing one of his links, so he sends it
      ;[bobSyncState, msg] = generateMessage(bobChain, bobSyncState)
      assert(msg)
      ;[aliceChain, aliceSyncState] = receiveMessage(aliceChain, aliceSyncState, msg)

      // đ©đŸ Alice now has Bob's full chain, so she can merge with it
      // đ©đŸ Alice provides the link đšđ»âđŠČ Bob requested, as well as the new merge link
      ;[aliceSyncState, msg] = generateMessage(aliceChain, aliceSyncState)
      assert(msg)
      ;[bobChain, bobSyncState] = receiveMessage(bobChain, bobSyncState, msg)

      // đšđ»âđŠČ Bob is caught up, so he lets Alice know
      ;[bobSyncState, msg] = generateMessage(bobChain, bobSyncState)
      assert(msg)
      ;[aliceChain, aliceSyncState] = receiveMessage(aliceChain, aliceSyncState, msg)

      // đ©đŸ Alice is caught up, so she lets Bob know
      ;[aliceSyncState, msg] = generateMessage(aliceChain, aliceSyncState)
      assert(msg)
      ;[bobChain, bobSyncState] = receiveMessage(bobChain, bobSyncState, msg)

      // Neither one has anything further to say
      ;[bobSyncState, msg] = generateMessage(bobChain, bobSyncState)
      expect(msg).toBeUndefined()
      ;[aliceSyncState, msg] = generateMessage(aliceChain, aliceSyncState)
      expect(msg).toBeUndefined()
    })
  })

  describe('with simulated network', () => {
    describe('manual setup', () => {
      const N = 10 // "many"

      it('one change', () => {
        const [{ alice, bob }, network] = setupWithNetwork('alice', 'bob')
        network.connect(alice.peer, bob.peer)

        // no changes yet; đ©đŸ Alice and đšđ»âđŠČ Bob are synced up
        expectToBeSynced(alice, bob)

        // đ©đŸ Alice makes a change; now they are out of sync
        alice.peer.chain = append({ chain: alice.peer.chain, action: { type: 'FOO' }, user: alice.user })
        expectNotToBeSynced(alice, bob)

        // đ©đŸ Alice exchanges sync messages with đšđ»âđŠČ Bob
        alice.peer.sync()
        network.deliverAll()

        // Now they are synced up again
        expectToBeSynced(alice, bob)
      })

      it('many changes', () => {
        const [{ alice, bob }, network] = setupWithNetwork('alice', 'bob')
        network.connect(alice.peer, bob.peer)
        // no changes yet; đ©đŸ Alice and đšđ»âđŠČ Bob are synced up
        expectToBeSynced(alice, bob)
        // đ©đŸ Alice makes many changes; now they are out of sync
        for (let i = 0; i < N; i++) {
          alice.peer.chain = append({ chain: alice.peer.chain, action: { type: 'FOO', payload: i }, user: alice.user })
        }
        expectNotToBeSynced(alice, bob)
        // đ©đŸ Alice exchanges sync messages with đšđ»âđŠČ Bob
        alice.peer.sync()
        const msgs = network.deliverAll()
        expect(msgs.length).toBeLessThanOrEqual(5)
        // Now they are synced up again
        expectToBeSynced(alice, bob)
      })

      it('many changes followed by a single change', () => {
        const [{ alice, bob }, network] = setupWithNetwork('alice', 'bob')
        network.connect(alice.peer, bob.peer)

        // đ©đŸ Alice makes many changes
        for (let i = 0; i < N; i++) {
          alice.peer.chain = append({ chain: alice.peer.chain, action: { type: 'FOO', payload: i }, user: alice.user })
        }
        alice.peer.sync()
        network.deliverAll()

        // they're synced up again
        expectToBeSynced(alice, bob)

        // đ©đŸ Alice makes one more change
        alice.peer.chain = append({ chain: alice.peer.chain, action: { type: 'FOO', payload: 999 }, user: alice.user })
        alice.peer.sync()

        network.deliverAll()
        expectToBeSynced(alice, bob)
      })

      it('concurrent changes', () => {
        const [{ alice, bob }, network] = setupWithNetwork('alice', 'bob')
        network.connect(alice.peer, bob.peer)

        // no changes yet; đ©đŸ Alice and đšđ»âđŠČ Bob are synced up
        expectToBeSynced(alice, bob)

        // đ©đŸ Alice and đšđ»âđŠČ Bob both make changes; now they are out of sync
        alice.peer.chain = append({ chain: alice.peer.chain, action: { type: 'FOO', payload: 999 }, user: alice.user })
        bob.peer.chain = append({ chain: bob.peer.chain, action: { type: 'PIZZA', payload: 42 }, user: bob.user })
        expectNotToBeSynced(alice, bob)

        // đ©đŸ Alice exchanges sync messages with đšđ»âđŠČ Bob
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

        // no changes yet; đ©đŸ Alice and đšđ»âđŠČ Bob are synced up
        expectToBeSynced(alice, bob)

        // đ©đŸ Alice and đšđ»âđŠČ Bob both make changes; now they are out of sync
        for (let i = 0; i < N; i++) {
          alice.peer.chain = append({ chain: alice.peer.chain, action: { type: 'BOO', payload: i }, user: alice.user })
          bob.peer.chain = append({ chain: bob.peer.chain, action: { type: 'PIZZA', payload: i }, user: bob.user })
        }
        expectNotToBeSynced(alice, bob)
        alice.peer.sync()
        bob.peer.sync()
        network.deliverAll()

        // Now they are synced up again
        expectToBeSynced(alice, bob)
      })

      it('three peers, concurrent changes', () => {
        const [{ alice, bob, charlie }, network] = setupWithNetwork('alice', 'bob', 'charlie')
        network.connect(alice.peer, bob.peer)
        network.connect(alice.peer, charlie.peer)
        network.connect(bob.peer, charlie.peer)

        alice.peer.chain = append({ chain: alice.peer.chain, action: { type: 'FOO' }, user: alice.user })

        alice.peer.sync()
        bob.peer.sync()
        charlie.peer.sync()
        network.deliverAll()

        // no changes yet; everyone is synced up
        expectToBeSynced(alice, bob)
        expectToBeSynced(bob, charlie)
        expectToBeSynced(alice, charlie)

        // everyone makes changes while offline; now they are out of sync
        alice.peer.chain = append({ chain: alice.peer.chain, action: { type: 'A' }, user: alice.user })
        bob.peer.chain = append({ chain: bob.peer.chain, action: { type: 'B' }, user: bob.user })
        charlie.peer.chain = append({ chain: charlie.peer.chain, action: { type: 'C' }, user: charlie.user })
        expectNotToBeSynced(alice, bob)

        // now they reconnect and sync back up
        alice.peer.sync()
        bob.peer.sync()
        charlie.peer.sync()
        network.deliverAll()

        // Now they are synced up again
        expectToBeSynced(alice, bob)
        expectToBeSynced(bob, charlie)
        expectToBeSynced(alice, charlie)
      })

      const expectToBeSynced = (a: TestUserStuff, b: TestUserStuff) => {
        expect(a.peer.chain.head).toEqual(b.peer.chain.head)
      }
      const expectNotToBeSynced = (a: TestUserStuff, b: TestUserStuff) => {
        expect(a.peer.chain.head).not.toEqual(b.peer.chain.head)
      }
    })

    describePeers('a', 'b')
    describePeers('a', 'b', 'c')
    describePeers('a', 'b', 'c', 'd')
    // describePeers('a', 'b', 'c', 'd', 'e')
    // describePeers('a', 'b', 'c', 'd', 'e', 'f')

    function describePeers(...userNames: string[]) {
      describe(`${userNames.length} peers`, () => {
        function connectAll(network: Network) {
          const peers = Object.values(network.peers)
          peers.forEach((a, i) => {
            const followingPeers = peers.slice(i + 1)
            followingPeers.forEach(b => {
              network.connect(a, b)
            })
          })
          return [userNames, network]
        }

        function connectDaisyChain(network: Network) {
          const peers = Object.values(network.peers)
          peers.slice(0, peers.length - 1).forEach((a, i) => {
            const b = peers[i + 1]
            network.connect(a, b)
          })
          return network
        }

        function assertAllEqual(network: Network) {
          const peers = Object.values(network.peers)
          peers.slice(0, peers.length - 1).forEach((a, i) => {
            const b = peers[i + 1]
            expect(a.chain.head).toEqual(b.chain.head)
          })
        }

        function assertAllDifferent(network: Network) {
          const peers = Object.values(network.peers)
          peers.slice(0, peers.length - 1).forEach((a, i) => {
            const b = peers[i + 1]
            expect(a.chain.head).not.toEqual(b.chain.head)
          })
        }

        it(`syncs a single change (direct connections)`, () => {
          const [userRecords, network] = setupWithNetwork(...userNames)
          connectAll(network)

          // first user makes a change
          const founder = userRecords[userNames[0]]
          founder.peer.chain = append({ chain: founder.peer.chain, action: { type: 'FOO' }, user: founder.user })

          founder.peer.sync()
          network.deliverAll()

          // all peers have the same doc
          assertAllEqual(network)
        })

        it(`syncs a single change (indirect connections)`, () => {
          const [userRecords, network] = setupWithNetwork(...userNames)
          connectDaisyChain(network)

          // first user makes a change
          const founder = userRecords[userNames[0]]
          founder.peer.chain = append({ chain: founder.peer.chain, action: { type: 'FOO' }, user: founder.user })

          for (const userName of userNames) userRecords[userName].peer.sync()
          network.deliverAll()

          // all peers have the same doc
          assertAllEqual(network)
        })

        it(`syncs multiple changes (direct connections)`, () => {
          const [userRecords, network] = setupWithNetwork(...userNames)
          connectAll(network)

          // each user makes a change
          for (const userName in userRecords) {
            const { user, peer } = userRecords[userName]
            peer.chain = append({ chain: peer.chain, action: { type: userName.toUpperCase() }, user })
            peer.sync()
            network.deliverAll()
          }

          // all peers have the same doc
          assertAllEqual(network)
        })

        it(`syncs multiple changes (indirect connections)`, () => {
          const [userRecords, network] = setupWithNetwork(...userNames)
          connectDaisyChain(network)

          // each user makes a change
          for (const userName in userRecords) {
            const { user, peer } = userRecords[userName]
            peer.chain = append({ chain: peer.chain, action: { type: userName.toUpperCase() }, user })
            peer.sync()
            network.deliverAll()
          }

          // all peers have the same doc
          assertAllEqual(network)
        })

        it('syncs divergent changes (indirect connections)', function () {
          const [userRecords, network] = setupWithNetwork(...userNames)
          connectDaisyChain(network)

          // each user makes a change
          for (const userName in userRecords) {
            const { user, peer } = userRecords[userName]
            peer.chain = append({ chain: peer.chain, action: { type: userName.toUpperCase() }, user })
          }

          // while they're disconnected, they have divergent docs
          assertAllDifferent(network)

          for (const userName in userRecords) {
            userRecords[userName].peer.sync()
          }
          network.deliverAll()

          // after connecting, their docs converge
          network.deliverAll()
          assertAllEqual(network)
        })

        it('syncs divergent changes (direct connections)', function () {
          const [userRecords, network] = setupWithNetwork(...userNames)
          connectAll(network)

          // each user makes a change
          for (const userName in userRecords) {
            const { user, peer } = userRecords[userName]
            peer.chain = append({ chain: peer.chain, action: { type: userName.toUpperCase() }, user })
          }

          // while they're disconnected, they have divergent docs
          assertAllDifferent(network)

          for (const userName in userRecords) {
            userRecords[userName].peer.sync()
          }
          network.deliverAll()

          // after connecting, their docs converge
          assertAllEqual(network)
        })
      })
    }
  })
})
