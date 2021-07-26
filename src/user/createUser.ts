import { randomKey } from '@herbcaudill/crypto'
import { UserWithSecrets } from '/user/types'
import { createKeyset, KeyType } from '/keyset'

/**
 * Creates a new local user, with randomly-generated keys.
 *
 * @param userName The local user's user name.
 * @param seed (optional) A seed for generating keys. This is typically only used for testing
 * purposes, to ensure predictable data.
 */
export const createUser = (userName: string, seed: string = randomKey()): UserWithSecrets => ({
  userName,
  keys: createKeyset({ type: KeyType.USER, name: userName }, seed),
})
