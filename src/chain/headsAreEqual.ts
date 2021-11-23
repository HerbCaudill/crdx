import { Hash } from '/util'

export const headsAreEqual = (a: Hash[], b: Hash[]) => {
  if (a.length !== b.length) return false

  a.sort()
  b.sort()
  return a.every((hash, i) => hash === b[i])
}
