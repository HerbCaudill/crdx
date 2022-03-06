import { randomKey } from '@herbcaudill/crypto'
import { createKeyset, KeyType } from '/keyset'
import { UserWithSecrets } from '/user/types'
import cuid from 'cuid'

/**
 * Creates a new local user, with randomly-generated keys.
 *
 * @param userName The local user's user name.
 * @param seed (optional) A seed for generating keys. This is typically only used for testing
 * purposes, to ensure predictable data.
 */
export const createUser = (userName: string, seed: string = randomKey()): UserWithSecrets => ({
  userId: cuid(),
  userName,
  keys: createKeyset({ type: KeyType.USER, name: userName }, seed),
})
