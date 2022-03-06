import { BloomFilter as _BloomFilter } from 'bloom-filters'
import msgpack from 'msgpack-lite'

export const ERROR_RATE = 0.0001

/** A Bloom filter is a probabilistic data structure that is used to test whether an element is a
 * member of a set. */
export class BloomFilter {
  private filter: _BloomFilter

  /** Load a previously saved filter */
  constructor(encodedFilter: Uint8Array)
  /** Create a new filter with given values */
  constructor(values: string[])
  constructor(input: string[] | Uint8Array) {
    if (input instanceof Uint8Array) {
      this.filter = this.load(input)
      return this
    } else {
      this.filter = _BloomFilter.from(input, ERROR_RATE)
    }
  }

  has(value: string): boolean {
    return this.filter.has(value)
  }

  load(encoded: Uint8Array) {
    const json = msgpack.decode(encoded)
    return _BloomFilter.fromJSON(json)
  }

  save() {
    const encoded = msgpack.encode(this.filter.saveAsJSON())
    return encoded
  }
}
