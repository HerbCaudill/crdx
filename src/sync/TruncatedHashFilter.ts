import { Hash } from '/util'
import { base58, hash } from '@herbcaudill/crypto'
import { ProbabilisticFilter } from './ProbabilisticFilter'
import { Buffer } from 'buffer'

// TODO: using this instead of a Bloom filter for now just because I understand it better

export class TruncatedHashFilter extends ProbabilisticFilter {
  resolution: number = 4
  hashes: Set<string>

  constructor(options: TruncatedHashFilterOptions = {}) {
    super()
    if (options.resolution !== undefined) this.resolution = options.resolution
    this.hashes = new Set()
  }

  add(values: string[]) {
    const hashes = values.map((value: string) => makeHash(value))
    this.addHashes(hashes)
    return this
  }

  addHashes(hashes: Hash[]) {
    for (const hash of hashes) {
      this.hashes.add(this.truncateHash(hash))
    }
    return this
  }

  has(value: string): boolean {
    return this.hasHash(makeHash(value))
  }

  hasHash(hash: string) {
    return this.hashes.has(this.truncateHash(hash))
  }

  save() {
    const encodedValue = this.encode(this.hashes)
    return encodedValue
  }

  load(encodedValue: Uint8Array) {
    const decodedValue = this.decode(encodedValue)
    this.hashes = decodedValue
    return this
  }

  private encode(decodedValue: Set<string>) {
    const encodedValue = new Uint8Array(decodedValue.size * this.resolution)
    let offset = 0
    for (const hash of decodedValue) {
      const bytes = Buffer.from(hash, 'hex')
      encodedValue.set(bytes, offset)
      offset += this.resolution
    }
    return encodedValue
  }

  private decode(encodedValue: Uint8Array): Set<string> {
    let offset = 0
    const decodedValue = new Set<string>()
    while (offset < encodedValue.length) {
      const bytes = encodedValue.subarray(offset, offset + this.resolution)
      const hash = Buffer.from(bytes).toString('hex')
      decodedValue.add(hash)
      offset += this.resolution
    }
    return decodedValue
  }

  private truncateHash(hash: Hash): Hash {
    const bytes = Buffer.from(base58.decode(hash))
    return bytes.slice(0, this.resolution).toString('hex')
  }
}
export const makeHash = (s: string) => {
  return hash('ProbabilisticFilter', s)
}

interface TruncatedHashFilterOptions {
  resolution?: number
}
