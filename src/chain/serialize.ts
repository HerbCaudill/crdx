import { Action, HashGraph } from './types'

export const serialize = <A extends Action, C>(chain: HashGraph<A, C>) => {
  return JSON.stringify(chain)
}

export const deserialize = <A extends Action, C>(serialized: string): HashGraph<A, C> => {
  return JSON.parse(serialized) as HashGraph<A, C>
}
