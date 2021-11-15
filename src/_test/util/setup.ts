import * as users from '/user'
import { UserWithSecrets } from '/user'
import { assert } from '/util'
import { arrayToMap } from './arrayToMap'

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
