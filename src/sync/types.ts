import { Base58 } from '@herbcaudill/crypto'
import { Action, LinkMap, EncryptedLink } from '/chain'
import { Hash } from '/util'
import { ValidationError } from '/validator'

export interface SyncState {
  their: {
    /** Their head as of the last time they sent a sync message. */
    head: Hash[]

    /** Links they've sent that we haven't added yet (e.g. because we're missing dependencies). */
    links: Record<Hash, Base58>

    /** The map of hashes they've sent. */
    linkMap?: LinkMap

    /** Hashes of links they asked for in the last message. */
    need: Hash[]

    /** The last error they sent us */
    reportedError?: ValidationError
  }

  our: {
    /** Our head as of the last message */
    head: Hash[]

    /** The last error we sent them */
    reportedError?: ValidationError

    /** Our head when we sent the last linkMap, so we don't keep sending it */
    linkMapAtHead?: Hash[]

    /** List of links we've sent them, so we don't send them multiple times */
    links: Hash[]
  }

  /** The head we had in common with this peer the last time we synced. If empty, we haven't synced before. */
  lastCommonHead: Hash[]

  /** We increment this each time a sync fails because we would have ended up with an invalid chain */
  failedSyncCount: number
}

export interface SyncMessage<A extends Action, C> {
  /** Our root. We just send this as a sanity check - if our roots don't match we can't sync. */
  root: Hash

  /** Our head at the time of sending. */
  head: Hash[]

  /** Any links we know we need. */
  links?: Record<Hash, Base58>

  /** Our most recent hashes and their dependencies. */
  linkMap?: LinkMap

  /** Any hashes we know we need. */
  need?: Hash[]

  error?: ValidationError
}
