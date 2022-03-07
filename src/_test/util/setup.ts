import * as users from '/user'
import { UserWithSecrets } from '/user'
import { assert } from '/util'
import { arrayToMap } from './arrayToMap'
import { KeysetWithSecrets } from '/keyset'

/**
Usage: 

```ts
const {alice, bob} = setup(['alice', 'bob'])
```
*/
export const setup = (...userNames: string[]) => {
  assert(userNames.length > 0)

  const testUsers: Record<string, UserWithSecrets> = userNames
    .map((userName: string) => {
      const randomSeed = userName // make these predictable
      return users.createUser(userName, randomSeed)
    })
    .reduce(arrayToMap('userName'), {})

  const makeUserStuff = (userName: string): UserWithSecrets => {
    return testUsers[userName]
  }

  const testUserStuff: Record<string, UserWithSecrets> = userNames.map(makeUserStuff).reduce(arrayToMap('userName'), {})

  return testUserStuff
}

export const TEST_CHAIN_KEYS: KeysetWithSecrets = {
  type: 'CHAIN',
  name: 'CHAIN',
  generation: 0,
  signature: {
    publicKey: 'GQrmBanGPSFBvZ4AHAoduk1jp7tXxa5fuzmWQTfbCbRT',
    secretKey: 'P7AgGTmMNedfpDixXF1rJgmVpyqAwCnGJRqyQzbm5wQbUnfoySAWMBzjxcm8USprqRNcW2ZoEEbzwPRX7EFuZkD',
  },
  encryption: {
    publicKey: '7QviM4tWnhSwrrmrZnqEm3vFWrp3nvFwdcQShaFZ7nXj',
    secretKey: 'HiFFKM6Eg1zkDHYkFcDLpEq7BM3k3FywHpj4zxQzVvHj',
  },
  secretKey: 'GUg4dKHG1KWnysf4tsMtbBXvbuknj2q34qvjxYZzc5eP',
}
