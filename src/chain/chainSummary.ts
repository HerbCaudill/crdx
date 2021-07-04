import { actionFingerprint } from '@/chain/actionFingerprint'
import { getSequence } from '@/chain/getSequence'
import { Action, SignatureChain } from '@/chain/types'

export const chainSummary = <A extends Action>(chain: SignatureChain<A>) => {
  const links = getSequence<Action>({ chain })
    .map(l => actionFingerprint(l))
    .join(', ')
  return links
}
