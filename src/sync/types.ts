import { Action, DependencyMap, EncryptedLink } from '/chain'
import { Hash } from '/util'
import { ValidationError } from '/validator'

export interface SyncState {
  their: {
    /** Their head as of the last time they sent a sync message. */
    head: Hash[]

    /** Links they've sent that we haven't added yet (e.g. because we're missing dependencies). */
    links: Record<Hash, EncryptedLink<any, any>>

    /** The accumulated map of hashes they've sent (each new set is merged into this). */
    linkMap?: DependencyMap
  }

  theyNeed: {
    /** Hashes of links they asked for in the last message. */
    links: Hash[]

    /** If true, we should send them a(nother) set of recent hashes  */
    moreLinkMap?: boolean
  }

  our: {
    /** Our head as of the last time we sent a sync message */
    head: Hash[]

    /** The last set of recent hashes we sent them */
    linkMap?: DependencyMap
  }

  /** The head we had in common with this peer the last time we synced. If empty, we haven't synced before. */
  lastCommonHead: Hash[]

  /** We increment this each time a sync fails because we would have ended up with an invalid chain */
  failedSyncCount: number

  lastError?: ValidationError
}

export interface SyncMessage<A extends Action, C> {
  our: {
    /** Our root. We just send this as a sanity check - if our roots don't match we can't sync. */
    root: Hash

    /** Our head at the time of sending. */
    head: Hash[]

    /** Any links we know we need. */
    links?: Record<Hash, EncryptedLink<A, C>>

    /** Our most recent hashes and their dependencies. */
    linkMap?: DependencyMap
  }

  weNeed?: {
    /** Any hashes we know we need. */
    links?: Hash[]

    /** We set this to true if we know there are more hashes we don't know about and we need them to send more. */
    moreLinkMap?: boolean
  }

  error?: ValidationError
}
