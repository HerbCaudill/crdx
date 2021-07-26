import { Action, SignatureChain } from './types'

export const serialize = <A extends Action, C>(chain: SignatureChain<A, C>) => {
  return JSON.stringify(chain)
}

export const deserialize = <A extends Action, C>(serialized: string): SignatureChain<A, C> => {
  return JSON.parse(serialized) as SignatureChain<A, C>
}
