﻿import { append } from '@/chain/append'
import { create } from '@/chain/create'
import { merge } from '@/chain/merge'
import { Action, NonMergeLink, isMergeLink, Link, LinkBody, SignatureChain, isRootLink } from '@/chain/types'
import { clone } from '@/util'
import { setup } from '@/test/util/setup'

const { alice } = setup('alice')

export const getPayloads = (sequence: Link<any>[]) =>
  sequence //
    .filter(link => !isRootLink(link) && !isMergeLink(link))
    .map(link => (link.body as LinkBody<Action>).payload)

export const findByPayload = (chain: SignatureChain<Action>, payload: Action['payload']) => {
  const links = Object.values(chain.links)
  return links.find(n => !isMergeLink(n) && n.body.payload === payload) as NonMergeLink<Action>
}

/**
 * Returns a chain with these links and branches (`*` = merge link):
 *
 *```
 *                   ┌─→ e ─→ g ─┐
 *a ─→ b ─┬─→ c ─→ d ┴─→ f ───── * ── * ─→ o ── * ─→ n
 *        ├─→ h ─→ i ─────────────────┘         │
 *        └─→ j ─→ k ─→ l ──────────────────────┘
 *```
 */
export const buildChain = () => {
  const appendLink = (chain: SignatureChain<Action>, payload: string) => append(chain, { type: 'X', payload }, alice)

  let root = create({ name: 'root' }, alice)
  let a = appendLink(root, 'a')
  let b = appendLink(a, 'b')

  // 3 branches from b:
  let b1 = clone(b)
  let b2 = clone(b)
  let b3 = clone(b)

  b1 = appendLink(b1, 'c')
  b1 = appendLink(b1, 'd')

  // 2 branches from d:
  let d1 = clone(b1)
  let d2 = clone(b1)

  d1 = appendLink(d1, 'e')
  d1 = appendLink(d1, 'g')

  d2 = appendLink(d2, 'f')

  b1 = merge(d1, d2) // *fg

  b2 = appendLink(b2, 'h')
  b2 = appendLink(b2, 'i')

  b1 = merge(b1, b2) // *i(fg)

  b1 = appendLink(b1, 'o')

  b3 = appendLink(b3, 'j')
  b3 = appendLink(b3, 'k')
  b3 = appendLink(b3, 'l')

  a = merge(b1, b3) // *ol

  a = appendLink(a, 'n')

  return a
}

export const getHashes = (chain: SignatureChain<any>) => Object.keys(chain.links)
