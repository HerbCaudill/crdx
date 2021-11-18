// ignore file coverage
import { setup } from './setup'
import { createChain, SignatureChain } from '/chain'
import { generateMessage } from '/sync/generateMessage'
import { initSyncState } from '/sync/initSyncState'
import { receiveMessage } from '/sync/receiveMessage'
import { SyncMessage, SyncState } from '/sync/types'
import { UserWithSecrets } from '/user'
import { assert, debug } from '/util'

const log = debug('crdx:network')

const logMessage = (msg: NetworkMessage) => {
  const { to, from, body } = msg
  const { head, links } = body
  log(`${from}->${to} ${head} (${links?.count || 0} links)`)
}

// Simulates a peer-to-peer network
export class Network {
  peers: Record<string, Peer>
  queue: NetworkMessage[]

  constructor() {
    this.peers = {}
    this.queue = []
  }

  registerPeer(peer: Peer) {
    this.peers[peer.userName] = peer
  }

  // Establishes a bidirectionial connection between two peers
  connect(a: Peer, b: Peer) {
    this.registerPeer(a)
    this.registerPeer(b)
    a.connect(b.userName)
    b.connect(a.userName)
  }

  // Enqueues one message to be sent from fromPeer to toPeer
  sendMessage(from: string, to: string, body: SyncMessage<any, any>) {
    this.queue.push({ from, to, body })
  }

  // Runs the protocol until all peers run out of things to say
  deliverAll() {
    let messageCount = 0
    const peerCount = Object.keys(this.peers).length
    const maxMessages = 5 ** peerCount // should be plenty - any more & something has gone haywire

    const delivered = [] as NetworkMessage[]

    while (this.queue.length) {
      // catch failure to converge
      if (messageCount++ > maxMessages) throw new Error('loop detected')

      // send the oldest message in the queue
      const message = this.queue.shift()
      assert(message) // make ts happy

      logMessage(message)

      const { to, from, body } = message
      this.peers[to].receiveMessage(from, body)

      // log the message for the results of this delivery run
      delivered.push(message)
    }
    // console.log(`${messageCount} msgs delivered`)
    return delivered
  }
}

// One peer, which may be connected to any number of other peers
export class Peer {
  syncStates: Record<string, SyncState>
  userName: string
  chain: SignatureChain<any, any>
  network: Network

  constructor(userName: string, chain: SignatureChain<any, any>, network: Network) {
    this.userName = userName
    this.chain = chain
    this.network = network
    this.network.registerPeer(this)
    this.syncStates = {}
  }

  // Called by Network.connect when a connection is established with a remote peer
  connect(userName: string) {
    this.syncStates[userName] = initSyncState()
  }

  // Generates and enqueues messages to all peers we're connected to (unless there is nothing to send)
  sync() {
    for (const [userName, prevSyncState] of Object.entries(this.syncStates)) {
      const [syncState, message] = generateMessage(this.chain, prevSyncState)
      this.syncStates[userName] = syncState
      if (message) this.network.sendMessage(this.userName, userName, message)
    }
  }

  // Called by Network when we receive a message from another peer
  receiveMessage(sender: string, message: SyncMessage<any, any>) {
    const [chain, syncState] = receiveMessage(this.chain, this.syncStates[sender], message)
    this.chain = chain
    this.syncStates[sender] = syncState
    this.sync()
  }
}

function truncateStack(err: Error, lines = 5) {
  err.stack = err
    .stack! //
    .split('\n')
    .slice(1, lines)
    .join('\n') // truncate repetitive stack
  return err
}

export type TestUserStuff = {
  user: UserWithSecrets
  peer: Peer
}

export const setupWithNetwork = (...userNames: string[]): [Record<string, TestUserStuff>, Network] => {
  const users = setup(...userNames)
  const founder = users[userNames[0]]
  const chain = createChain({ user: founder })

  const network = new Network()

  const userRecords = {} as Record<string, TestUserStuff>
  for (const userName in users) {
    const user = users[userName]
    const peer = new Peer(userName, chain, network)
    userRecords[userName] = { user, peer }
  }

  return [userRecords, network]
}

export type NetworkMessage = {
  to: string
  from: string
  body: SyncMessage<any, any>
}
