import { Link } from '@/chain/types'
import { hash } from '@herbcaudill/crypto'

export const arbitraryDeterministicSort = (hashKey = 'DETERMINISTIC_SORT') => (a: Link<any>[], b: Link<any>[]) =>
  hash(hashKey, a) > hash(hashKey, b) ? 1 : -1
