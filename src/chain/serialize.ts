import { Action, SignatureChain } from '@/chain'

export const serialize = <A extends Action>(chain: SignatureChain<A>) => {
  return JSON.stringify(chain)
}

export const deserialize = <A extends Action>(serialized: string): SignatureChain<A> => {
  return JSON.parse(serialized) as SignatureChain<A>
}
