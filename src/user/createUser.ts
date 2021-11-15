import { createKeyset, KeyType, randomKey } from '/keyset'
import { UserWithSecrets } from '/user/types'

/**
 * Creates a new local user, with randomly-generated keys.
 *
 * @param userName The local user's user name.
 * @param seed (optional) A seed for generating keys. This is typically only used for testing
 * purposes, to ensure predictable data.
 */
export const createUser = async (userName: string, seed?: string): Promise<UserWithSecrets> => {
  seed = seed ?? (await randomKey())
  return {
    userName,
    keys: await createKeyset({ type: KeyType.USER, name: userName }, seed),
  }
}
