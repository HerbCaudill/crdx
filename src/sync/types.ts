import { Action, DependencyMap, EncryptedLink } from '/chain'
import { Hash } from '/util'

export interface SyncState {
  /** The head we had in common with this peer the last time we synced. If null, we don't have any
   * record of having synced before. */
  lastCommonHead: Hash[]

  ////// their stuff (populated in receiveMessage)

  /** Their head as of the last time they sent a sync message */
  theirHead: Hash[]

  /** All the links they've sent us*/
  theyHaveSent: Hash[]

  /** Links they've sent that we haven't been able to absorb yet (e.g. because we're missing dependencies) */
  links: Record<Hash, EncryptedLink<any, any>>

  theirRecentHashes: DependencyMap

  theirNeed: Hash[]

  sendRecentHashes: boolean

  ////// our stuff (populated in generateMessage)

  /** Our head as of the last time we sent a sync message */
  ourHead: Hash[]

  /** All the links we've sent them */
  weHaveSent: Hash[]

  ourRecentHashes: DependencyMap
}

export interface SyncMessage<A extends Action, C> {
  /** Our root. We just send this as a sanity check - if our roots don't match we can't sync. */
  root: Hash

  /** Our head at the time of sending. */
  head: Hash[]

  /** Any links we know they need. */
  links?: Record<Hash, EncryptedLink<A, C>>

  recentHashes: DependencyMap

  sendMoreHashes?: boolean

  /** Any hashes we know we need. */
  need?: Hash[]
}
