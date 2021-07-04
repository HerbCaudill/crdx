import { cache } from './cache'
import { LocalUserContext } from '@/context'
import * as devices from '@/device'
import { DeviceWithSecrets } from '@/device'
import * as users from '@/user'
import { User } from '@/user'
import { arrayToMap, assert } from '@/util'

/**
Usage: 

```ts
const {alice, bob} = setup(['alice', 'bob'])
```
*/
export const setup = (...userNames: string[]) => {
  assert(userNames.length > 0)

  const cacheKey = 'setup-' + JSON.stringify(userNames)
  const { testUsers, laptops, phones } = cache(cacheKey, () => {
    // Create users
    const testUsers: Record<string, User> = userNames
      .map((userName: string) => {
        const randomSeed = userName // make these predictable
        return users.create(userName, randomSeed)
      })
      .reduce(arrayToMap('userName'), {})

    const makeDevice = (userName: string, deviceName: string) => {
      const key = `${userName}-${deviceName}`
      const randomSeed = key
      const device = devices.create(userName, deviceName, randomSeed)
      return device
    }

    const laptops: Record<
      string,
      DeviceWithSecrets
    > = userNames
      .map((userName: string) => makeDevice(userName, 'laptop'))
      .reduce(arrayToMap('userName'), {})

    const phones: Record<
      string,
      DeviceWithSecrets
    > = userNames
      .map((userName: string) => makeDevice(userName, 'phone'))
      .reduce(arrayToMap('userName'), {})

    return { testUsers, laptops, phones }
  })

  const makeUserStuff = (userName: string): UserStuff => {
    const user = testUsers[userName]
    const device = laptops[userName]
    const phone = phones[userName]
    const localContext = { user, device }

    return {
      userName,
      user,
      device,
      localContext,
      phone,
    }
  }

  const testUserStuff: Record<string, UserStuff> = userNames
    .map(makeUserStuff)
    .reduce(arrayToMap('userName'), {})

  return testUserStuff
}

// TYPES

export type TestUserSettings = {
  user: string
  admin?: boolean
  member?: boolean
}

export interface UserStuff {
  userName: string
  user: User
  device: DeviceWithSecrets
  phone: DeviceWithSecrets
  localContext: LocalUserContext
}
