import { Keyset } from '@/keyset'
import { Device } from '@/device'

export interface Member {
  userName: string
  keys: Keyset
  roles: string[]
  devices?: Device[]
  keyHistory?: Keyset[]
}
