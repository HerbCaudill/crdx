// ignore file coverage
import { setup } from './setup'
import { createChain, headsAreEqual, HashGraph } from '/chain'
import { KeysetWithSecrets } from '/keyset'
import { generateMessage } from '/sync/generateMessage'
import { initSyncState } from '/sync/initSyncState'
import { receiveMessage } from '/sync/receiveMessage'
import { SyncMessage, SyncState } from '/sync/types'
import { TEST_CHAIN_KEYS as chainKeys } from '/test/util/setup'
import { UserWithSecrets } from '/user'
import { assert, debug } from '/util'

const log = debug('crdx:network')

const logMessage = (msg: NetworkMessage) => {
  const { to, from, body } = msg
  const { head, links } = body
  log(`${from}->${to} ${head} (${links?.count || 0} links)`)
}

/** Simulates a peer-to-peer network. */
export class Network {
  peers: Record<string, Peer>
  queue: NetworkMessage[]
  chainKeys: KeysetWithSecrets
  constructor(chainKeys: KeysetWithSecrets) {
    this.peers = {}
    this.queue = []
    this.chainKeys = chainKeys
  }

  registerPeer(peer: Peer) {
    this.peers[peer.userName] = peer
  }

  /** Establishes a bidirectionial connection between two peers */
  connect(a: Peer, b: Peer) {
    this.registerPeer(a)
    this.registerPeer(b)
    a.connect(b.userName)
    b.connect(a.userName)
  }

  /** Enqueues one message to be sent from fromPeer to toPeer */
  sendMessage(from: string, to: string, body: SyncMessage<any, any>) {
    this.queue.push({ from, to, body })
  }

  /** Runs the protocol until all peers run out of things to say */
  deliverAll() {
    let messageCount = 0
    const peerCount = Object.keys(this.peers).length
    const maxMessages = 3 ** peerCount // should be plenty - any more & something has gone haywire

    const delivered = [] as NetworkMessage[]

    while (this.queue.length) {
      // catch failure to converge
      if (messageCount++ > maxMessages) throw new Error('loop detected')

      // send the oldest message in the queue
      const message = this.queue.shift()!

      const { to, from, body } = message
      this.peers[to].receiveMessage(from, body)

      delivered.push(message)
    }
    return delivered
  }
}

/** One peer, which may be connected to any number of other peers */
export class Peer {
  syncStates: Record<string, SyncState>
  userName: string
  chain: HashGraph<any, any>
  network: Network

  constructor(userName: string, chain: HashGraph<any, any>, network: Network) {
    this.userName = userName
    this.chain = chain
    this.network = network
    this.network.registerPeer(this)
    this.syncStates = {}
  }

  /**  Called by Network.connect when a connection is established with a remote peer */
  connect(userName: string) {
    this.syncStates[userName] = initSyncState()
  }

  /**  Generates and enqueues messages to the named peer (or if none given, to all peers we're connected to) (unless there is nothing to send) */
  sync(userName?: string) {
    if (userName) {
      // sync only with this peer
      const [syncState, message] = generateMessage(this.chain, this.syncStates[userName])
      this.syncStates[userName] = syncState
      if (message) this.network.sendMessage(this.userName, userName, message)
    } else {
      // sync with everyone
      for (const userName of Object.keys(this.syncStates)) this.sync(userName)
    }
  }

  /** Called by Network when we receive a message from another peer */
  receiveMessage(sender: string, message: SyncMessage<any, any>) {
    if (message.error) {
      throw new Error(`${message.error.message}\n${JSON.stringify(message.error.details, null, 2)}`)
    }

    const prevHead = this.chain.head

    const [chain, syncState] = receiveMessage(this.chain, this.syncStates[sender], message, chainKeys)
    this.chain = chain
    this.syncStates[sender] = syncState

    // has our chain changed at all as a result of this message?
    if (headsAreEqual(prevHead, chain.head)) {
      // no change, just reply to the sender
      this.sync(sender)
    } else {
      // our chain has changed, sync with everyone
      this.sync()
    }
  }
}

export const setupWithNetwork =
  (chainKeys: KeysetWithSecrets) =>
  (...userNames: string[]) => {
    const users = setup(...userNames)
    const founderUserName = userNames[0]
    const founderUser = users[founderUserName]

    const chain = createChain({ user: founderUser, chainKeys })

    const network = new Network(chainKeys)

    const userRecords = {} as Record<string, TestUserStuff>
    for (const userName in users) {
      const user = users[userName]
      const peer = new Peer(userName, chain, network)
      userRecords[userName] = { user, peer }
    }

    const founder = userRecords[founderUserName]
    return { userRecords, network, founder }
  }

export const expectToBeSynced = (a: TestUserStuff, b: TestUserStuff) => {
  expect(a.peer.chain.head).toEqual(b.peer.chain.head)
}

export const expectNotToBeSynced = (a: TestUserStuff, b: TestUserStuff) => {
  expect(a.peer.chain.head).not.toEqual(b.peer.chain.head)
}

export type NetworkMessage = {
  to: string
  from: string
  body: SyncMessage<any, any>
}

export type TestUserStuff = {
  user: UserWithSecrets
  peer: Peer
}
