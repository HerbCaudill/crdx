import { BloomFilter } from './BloomFilter'

describe('Bloom filter', () => {
  it('2 values', () => {
    const filter = new BloomFilter(['a', 'b'])

    // no false negatives
    expect(filter.has('a')).toBe(true)
    expect(filter.has('b')).toBe(true)

    // no false positives
    expect(filter.has('c')).toBe(false)
    expect(filter.has('d')).toBe(false)
  })

  it('many consecutive items', () => {
    const N = 1000
    const numbers = range(N)

    const filter = new BloomFilter(numbers)

    // no false negatives
    for (const n of numbers) {
      expect(filter.has(n)).toBe(true)
    }

    expect(filter.has('pizza')).toBe(false)

    // few false positives
    const moreNumbers = range(N).map(n => n + N)
    const falsePositives = moreNumbers.filter(n => filter.has(n))
    expect(falsePositives.length / N).toBeLessThan(0.0001)
  })

  it('many random items', () => {
    const N = 1000
    const numbers = range(N).map(n => Math.random().toString())

    const filter = new BloomFilter(numbers)

    // no false negatives
    for (const n of numbers) {
      expect(filter.has(n)).toBe(true)
    }

    // few false positives
    const moreNumbers = range(N).map(n => n + N)
    const falsePositives = moreNumbers.filter(n => filter.has(n)).length
    expect(falsePositives / N).toBeLessThan(0.0001)
  })

  it('save/rehydrate round trip', () => {
    const N = 10
    const numbers = range(N)

    const filter = new BloomFilter(numbers)

    // store or transmit the filter's value
    const storedValue = filter.save()

    // rehydrate from the stored value
    const newFilter = new BloomFilter(storedValue)

    // the saved values match
    expect(newFilter.save()).toEqual(storedValue)
  })

  it('10 items, testing with rehydrated filter', () => {
    const N = 10
    const numbers = range(N)

    const filter = new BloomFilter(numbers)

    // store or transmit the filter's value
    const storedValue = filter.save()

    const newFilter = new BloomFilter(storedValue)

    // no false negatives
    for (const n of numbers) {
      expect(newFilter.has(n)).toBe(true)
    }

    // no false positives
    const moreNumbers = range(N).map(n => n + N)
    for (const n of moreNumbers) {
      expect(newFilter.has(n)).toBe(false)
    }
  })
})

const range = (size: number): string[] => [...Array(size).keys()].map(n => n.toString())
