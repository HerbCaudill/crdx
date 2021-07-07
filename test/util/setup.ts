import * as users from '@/user'
import { UserWithSecrets } from '@/user'
import { arrayToMap, assert } from '@/util'
import { cache } from './cache'

/**
Usage: 

```ts
const {alice, bob} = setup(['alice', 'bob'])
```
*/
export const setup = (...userNames: string[]) => {
  assert(userNames.length > 0)

  const cacheKey = 'setup-' + JSON.stringify(userNames)
  const { testUsers } = cache(cacheKey, () => {
    // Create users
    const testUsers: Record<string, UserWithSecrets> = userNames
      .map((userName: string) => {
        const randomSeed = userName // make these predictable
        return users.create(userName, randomSeed)
      })
      .reduce(arrayToMap('userName'), {})

    return { testUsers }
  })

  const makeUserStuff = (userName: string): UserWithSecrets => {
    return testUsers[userName]
  }

  const testUserStuff: Record<string, UserWithSecrets> = userNames.map(makeUserStuff).reduce(arrayToMap('userName'), {})

  return testUserStuff
}
