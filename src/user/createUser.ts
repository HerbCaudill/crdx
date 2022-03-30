import { createKeyset, KeyType } from '/keyset'
import { UserWithSecrets } from '/user/types'
import cuid from 'cuid'

/**
 * Creates a new local user, with randomly-generated keys.
 */
export const createUser = (userName: string, userId: string = cuid()): UserWithSecrets => {
  return {
    userId,
    userName,
    keys: createKeyset({ type: KeyType.USER, name: userId }),
  }
}
