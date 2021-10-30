import { append } from '/chain/append'
import { createChain } from '/chain/createChain'
import { merge } from '/chain/merge'
import { Action, Link, LinkBody, SignatureChain, isRootLink } from '/chain/types'
import clone from 'lodash/clone'
import { setup } from '/test/util/setup'

const { alice } = setup('alice')

export const getPayloads = (sequence: Link<XAction, any>[]) =>
  sequence //
    .filter(link => !isRootLink(link))
    .map(link => (link.body as LinkBody<XAction, any>).payload)
    .join('')

export const findByPayload = (chain: SignatureChain<XAction, any>, payload: XAction['payload']) => {
  const links = Object.values(chain.links)
  return links.find(n => n.body.payload === payload) as Link<XAction, any>
}

/**
 * Returns this chain:
 *```
 *        ┌─ b
 *     a ─┤
 *        └─ c
 *```
 */
export const buildSimpleChain = () => {
  let root = createChain<XAction, any>({ user: alice, name: 'root' })
  let a = appendLink(root, 'a')

  let a1 = appendLink(clone(a), 'b')
  let a2 = appendLink(clone(a), 'c')

  return merge(a1, a2)
}

/**
 * Returns this chain:
 *```
 *                      ┌─ e ─ g ─┐
 *            ┌─ c ─ d ─┤         ├─ o ─┐
 *     a ─ b ─┤         └─── f ───┤     ├─ n
 *            ├──── h ──── i ─────┘     │
 *            └───── j ─── k ── l ──────┘
 *
 *```


ab((cd(eg|f)|hi)o|jkl)n

 */

export const buildComplexChain = () => {
  let root = createChain<XAction, any>({ user: alice, name: 'root' })
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

export const getHashes = (chain: SignatureChain<any, any>) => Object.keys(chain.links)

export interface XAction extends Action {
  type: 'X'
  payload: string
}
export type XLink = Link<XAction, {}>

const appendLink = (chain: SignatureChain<XAction, any>, payload: string) =>
  append({ chain, action: { type: 'X', payload } as XAction, user: alice })
