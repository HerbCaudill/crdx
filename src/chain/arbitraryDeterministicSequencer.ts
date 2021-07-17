import { Link, Sequencer } from '@/chain/types'
import { hash } from '@herbcaudill/crypto'

export const arbitraryDeterministicSequencer: Sequencer = (a, b) => {
  const [_a, _b] = [a, b].sort(arbitraryDeterministicSort()) // ensure predictable order
  return _a.concat(_b)
}

export const arbitraryDeterministicSort = (hashKey = 'DETERMINISTIC_SORT') => (a: Link<any>[], b: Link<any>[]) =>
  hash(hashKey, a) > hash(hashKey, b) ? 1 : -1
