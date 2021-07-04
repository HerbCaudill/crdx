import { Keyset, KeysetWithSecrets } from '@/keyset'

export interface User {
  /** Username (or ID or email) */
  userName: string

  /** The user's public keys. */
  keys: Keyset
}

/** The local user and their full set of keys, including secrets.   */
export interface UserWithSecrets {
  /** Username (or ID or email) */
  userName: string

  /** The user's secret keys. */
  keys: KeysetWithSecrets
}
