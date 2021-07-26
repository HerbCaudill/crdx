import { UserWithSecrets } from './types'
import { redactKeys } from '/keyset'
import { User } from '/user'

export const redactUser = (user: User | UserWithSecrets): User => {
  const { userName } = user
  return {
    userName,
    keys: redactKeys(user.keys),
  }
}
