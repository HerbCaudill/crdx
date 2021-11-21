import { Hash } from '/util'

export abstract class ProbabilisticFilter {
  constructor() {}

  abstract add(values: string[]): this

  abstract addHashes(hashes: Hash[]): this

  abstract has(value: string): boolean

  abstract hasHash(hash: Hash): boolean

  abstract save(): Uint8Array
  abstract load(encodedValue: Uint8Array): ProbabilisticFilter
}
