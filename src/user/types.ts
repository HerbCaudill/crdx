﻿import { Keyset, KeysetWithSecrets } from '/keyset'
import { UUID } from '/util/types'

export interface User {
  /** Unique ID populated on creation. */
  userId: UUID

  /** Username (or email). Must be unique but is not used for lookups. Only provided to connect
   * human identities with other systems. */
  userName: string

  /** The user's public keys. */
  keys: Keyset
}

/** The local user and their full set of keys, including secrets.   */
export interface UserWithSecrets {
  userId: UUID
  userName: string

  /** The user's secret keys. */
  keys: KeysetWithSecrets
}
