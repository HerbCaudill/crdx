import { append } from '/chain/append'
import { createChain } from '/chain/createChain'
import { merge } from '/chain/merge'
import { Action, Link, LinkBody, SignatureChain, isRootLink } from '/chain/types'
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

export const buildChain = (type: string) => {
  let root = createChain<XAction>({ user: alice, name: 'root' })
  switch (trim(type)) {
    // one link
    case 'a': {
      let a = appendLink(root, 'a')
      return a
    }

    // no branches
    case trim(`a ─ b ─ c`): {
      let a = appendLink(root, 'a')
      let b = appendLink(a, 'b')
      let c = appendLink(b, 'c')
      return c
    }

    // simple
    case trim(`
            ┌─ b
         a ─┤
            └─ c
      `): {
      let a = appendLink(root, 'a')
      let b = appendLink(a, 'b')
      let c = appendLink(a, 'c')
      return merge(b, c)
    }

    // complex
    case trim(`
                          ┌─ e ─ g ─┐
                ┌─ c ─ d ─┤         ├─ o ─┐
         a ─ b ─┤         └─── f ───┤     ├─ n
                ├──── h ──── i ─────┘     │
                └───── j ─── k ── l ──────┘
      `): {
      let a = appendLink(root, 'a')
      let b = appendLink(a, 'b')
      let c = appendLink(b, 'c')
      let d = appendLink(c, 'd')
      let e = appendLink(d, 'e')
      let g = appendLink(e, 'g')

      let f = appendLink(d, 'f')

      let h = appendLink(b, 'h')
      let i = appendLink(h, 'i')

      let j = appendLink(b, 'j')
      let k = appendLink(j, 'k')
      let l = appendLink(k, 'l')

      let o = appendLink(merge(g, merge(f, i)), 'o')

      let n = appendLink(merge(o, l), 'n')
      return n
    }

    // tricky
    case trim(`
                          ┌─── h ────┐
                ┌─ c ─ e ─┤          ├─ k
         a ─ b ─┤         └── i ─ j ─┘
                └── d ────────┘
      `): {
      let a = appendLink(root, 'a')
      let b = appendLink(a, 'b')
      let c = appendLink(b, 'c')
      let e = appendLink(c, 'e')
      let h = appendLink(e, 'h')

      let d = appendLink(b, 'd')

      let i = appendLink(merge(e, d), 'i')
      let j = appendLink(i, 'j')

      let k = appendLink(merge(h, j), 'k')
      return k
    }

    // multiple heads
    case trim(`
                          ┌─ e ─ g ─┐
                ┌─ c ─ d ─┤         ├─ o 
         a ─ b ─┤         └─── f ───┘     
                ├─ h ─ i  
                └─ j 
      `): {
      let a = appendLink(root, 'a')
      let b = appendLink(a, 'b')
      let c = appendLink(b, 'c')
      let d = appendLink(c, 'd')
      let e = appendLink(d, 'e')
      let g = appendLink(e, 'g')
      let f = appendLink(d, 'f')
      let o = appendLink(merge(g, f), 'o')

      let h = appendLink(b, 'h')
      let i = appendLink(h, 'i')

      let j = appendLink(b, 'j')

      return merge(o, merge(i, j))
    }

    default:
      throw new Error('unknown chain')
  }
}

export const getHashes = (chain: SignatureChain<any, any>) => Object.keys(chain.links)

export interface XAction extends Action {
  type: 'X'
  payload: string
}
export type XLink = Link<XAction, {}>

const appendLink = (chain: SignatureChain<XAction, any>, payload: string) =>
  append({ chain, action: { type: 'X', payload } as XAction, user: alice })

const trim = (s: string) => s.replace(/\s*/g, '')
