import { randomKey } from '@herbcaudill/crypto'
import * as keyset from '@/keyset'
import { UserWithSecrets } from '@/user/types'

const { USER } = keyset.KeyType

/**
 * Creates a new local user, with randomly-generated keys.
 *
 * @param userName The local user's user name.
 * @param seed (optional) A seed for generating keys. This is typically only used for testing
 * purposes, to ensure predictable data.
 */
export const create = (userName: string, seed: string = randomKey()): UserWithSecrets => ({
  userName,
  keys: keyset.createKeyset({ type: USER, name: userName }, seed),
})
