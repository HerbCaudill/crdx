import { hash } from '@herbcaudill/crypto'
import { Hash } from '/util'

export abstract class ProbabilisticFilter {
  constructor() {}

  add(values: string[]) {
    const hashes = values.map((value: string) => makeHash(value))
    this.addHashes(hashes)
    return this
  }

  abstract addHashes(hashes: Hash[]): ProbabilisticFilter

  has(value: string) {
    return this.hasHash(makeHash(value))
  }

  abstract hasHash(hash: Hash): boolean

  abstract save(): Uint8Array
  abstract load(encodedValue: Uint8Array): ProbabilisticFilter
}

export const makeHash = (s: string) => {
  return hash('ProbabilisticFilter', s)
}
