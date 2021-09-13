import { hash } from '@herbcaudill/crypto'
import { Link, Resolver } from './types'

export const baseResolver: Resolver<any, any> = ([a, b]) => {
  const [_a, _b] = [a, b].sort(arbitraryDeterministicSort()) // ensure predictable order
  return _a.concat(_b)
}

export const arbitraryDeterministicSort = (hashKey = 'DETERMINISTIC_SORT') => (
  a: Link<any, any>[],
  b: Link<any, any>[]
) => (hash(hashKey, a) > hash(hashKey, b) ? 1 : -1)
