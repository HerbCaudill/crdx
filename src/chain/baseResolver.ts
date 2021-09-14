import { hash } from '@herbcaudill/crypto'
import { Link, Resolver } from './types'

export const baseResolver: Resolver<any, any> = sequences =>
  sequences
    .sort(arbitraryDeterministicSort()) // choose one to go first, in predictable order
    .flat() // join the two sequences into a single one

export const arbitraryDeterministicSort = (hashKey = 'DETERMINISTIC_SORT') => (
  a: Link<any, any>[],
  b: Link<any, any>[]
) => (hash(hashKey, a) > hash(hashKey, b) ? 1 : -1)
