import { Action, EncryptedLink, Link } from '/chain'
import { Hash } from '/util'

export interface SyncState {
  /** The head we had in common with this peer the last time we synced. If null, we don't have any
   * record of having synced before. */
  lastCommonHead: Hash[]

  /** Our head as of the last time we sent a sync message */
  ourHead: Hash[]

  /** Links that we know we need because links we have depend on them */
  ourNeed: Hash[]

  /** Their head as of the last time they sent a sync message */
  theirHead: Hash[]

  /** Links they said they needed in their most recent sync message */
  theirNeed: Hash[]

  /** All the links we've sent them */
  weHaveSent: Hash[]

  /** All the links they've sent us*/
  theyHaveSent: Hash[]

  /** Links they've sent that we haven't been able to absorb yet because we're missing dependencies */
  pendingLinks: Record<Hash, EncryptedLink<any, any>>
}

export interface SyncMessage<A extends Action, C> {
  /** Our root. We just send this as a sanity check - if our roots don't match we can't sync. */
  root: Hash

  /** Our head at the time of sending. */
  head: Hash[]

  /** Any links we know they need. */
  links?: Record<Hash, EncryptedLink<A, C>>

  /** Any hashes we know we need. */
  need?: Hash[]

  /** A byte-array encoding of a Bloom filter representing the hashes we have  */
  encodedFilter?: Uint8Array
}
