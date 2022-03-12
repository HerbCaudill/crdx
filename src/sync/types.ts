import { Action, DependencyMap, EncryptedLink } from '/chain'
import { Hash } from '/util'

export interface SyncState {
  /** The head we had in common with this peer the last time we synced. If empty, we haven't synced before. */
  lastCommonHead: Hash[]

  /** Their head as of the last time they sent a sync message. */
  theirHead: Hash[]

  /** Links they've sent that we haven't added yet (e.g. because we're missing dependencies). */
  pendingLinks: Record<Hash, EncryptedLink<any, any>>

  /** The accumulated map of hashes they've sent (each new set is merged into this). */
  theirDependencyMap?: DependencyMap

  /** Hashes of links they asked for in the last message. */
  theirNeed: Hash[]

  /** If true, we should send them a(nother) set of recent hashes  */
  sendRecentHashes: boolean

  /** Our head as of the last time we sent a sync message */
  ourHead: Hash[]

  /** The last set of recent hashes we sent them */
  ourRecentHashes?: DependencyMap
}

export interface SyncMessage<A extends Action, C> {
  /** Our root. We just send this as a sanity check - if our roots don't match we can't sync. */
  root: Hash

  /** Our head at the time of sending. */
  head: Hash[]

  /** Any links we know we need. */
  links?: Record<Hash, EncryptedLink<A, C>>

  /** Our most recent hashes and their dependencies. */
  recentHashes?: DependencyMap

  /** We set this to true if we know there are more hashes we don't know about and we need them to send more. */
  sendMoreHashes?: boolean

  /** Any hashes we know we need. */
  need?: Hash[]
}
