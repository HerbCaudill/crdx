import { append } from '/chain/append'
import { createChain } from '/chain/createChain'
import { merge } from '/chain/merge'
import { Action, Link, LinkBody, SignatureChain } from '/chain/types'
import { KeysetWithSecrets } from '/keyset'
import { setup, TEST_CHAIN_KEYS as chainKeys } from '/test/util/setup'

const { alice } = setup('alice')

export const getPayloads = (sequence: Link<XAction, any>[]) =>
  sequence //
    .filter(link => link.body.prev.length) // omit root link
    .filter(link => link.isInvalid !== true) // omit invalid links
    .map(link => (link.body as LinkBody<XAction, any>).payload) // pull out payloads
    .join('') // return as single string

export const findByPayload = (chain: SignatureChain<XAction, any>, payload: XAction['payload']) => {
  const links = Object.values(chain.links)
  return links.find(n => n.body.payload === payload) as Link<XAction, any>
}

// ignore coverage
export const byPayload = (a: Link<XAction, any>, b: Link<XAction, any>) => {
  return a.body.payload < b.body.payload ? -1 : a.body.payload > b.body.payload ? 1 : 0
}

export const buildChain = (type: string) => {
  let root = createChain<XAction>({ user: alice, name: 'root', chainKeys })
  switch (trim(type)) {
    // one link
    case 'a': {
      let a = appendLink(root, 'a', chainKeys)
      return a
    }

    // no branches
    case trim(`a ─ b ─ c`): {
      let a = appendLink(root, 'a', chainKeys)
      let b = appendLink(a, 'b', chainKeys)
      let c = appendLink(b, 'c', chainKeys)
      return c
    }

    // simple open
    case trim(`
            ┌─ b
         a ─┤
            └─ c
      `): {
      let a = appendLink(root, 'a', chainKeys)
      let b = appendLink(a, 'b', chainKeys)
      let c = appendLink(a, 'c', chainKeys)
      return merge(b, c)
    }

    // simple closed
    case trim(`
            ┌─ b ─ c ─┐
         a ─┤         ├─ e   
            └─── d ───┘

      `): {
      let a = appendLink(root, 'a', chainKeys)
      let b = appendLink(a, 'b', chainKeys)
      let c = appendLink(b, 'c', chainKeys)
      let d = appendLink(a, 'd', chainKeys)
      let e = appendLink(merge(c, d), 'e', chainKeys)
      return e
    }

    // double closed
    case trim(`
            ┌─ b ─ c ─┐     ┌─ f ─ g ─┐
         a ─┤         ├─ e ─┤         ├─ i    
            └─── d ───┘     └─── h ───┘

      `): {
      let a = appendLink(root, 'a', chainKeys)
      let b = appendLink(a, 'b', chainKeys)
      let c = appendLink(b, 'c', chainKeys)
      let d = appendLink(a, 'd', chainKeys)
      let e = appendLink(merge(c, d), 'e', chainKeys)
      let f = appendLink(e, 'f', chainKeys)
      let g = appendLink(f, 'g', chainKeys)
      let h = appendLink(e, 'h', chainKeys)
      let i = appendLink(merge(g, h), 'i', chainKeys)
      return i
    }

    // complex
    case trim(`
                          ┌─ e ─ g ─┐
                ┌─ c ─ d ─┤         ├─ o ─┐
         a ─ b ─┤         └─── f ───┤     ├─ n
                ├──── h ──── i ─────┘     │
                └───── j ─── k ── l ──────┘
      `): {
      let a = appendLink(root, 'a', chainKeys)
      let b = appendLink(a, 'b', chainKeys)
      let c = appendLink(b, 'c', chainKeys)
      let d = appendLink(c, 'd', chainKeys)
      let e = appendLink(d, 'e', chainKeys)
      let g = appendLink(e, 'g', chainKeys)

      let f = appendLink(d, 'f', chainKeys)

      let h = appendLink(b, 'h', chainKeys)
      let i = appendLink(h, 'i', chainKeys)

      let j = appendLink(b, 'j', chainKeys)
      let k = appendLink(j, 'k', chainKeys)
      let l = appendLink(k, 'l', chainKeys)

      let o = appendLink(merge(g, merge(f, i)), 'o', chainKeys)

      let n = appendLink(merge(o, l), 'n', chainKeys)
      return n
    }

    // tricky
    case trim(`
                          ┌─── h ────┐
                ┌─ c ─ e ─┤          ├─ k
         a ─ b ─┤         └── i ─ j ─┘
                └── d ────────┘
      `): {
      let a = appendLink(root, 'a', chainKeys)
      let b = appendLink(a, 'b', chainKeys)
      let c = appendLink(b, 'c', chainKeys)
      let e = appendLink(c, 'e', chainKeys)
      let h = appendLink(e, 'h', chainKeys)

      let d = appendLink(b, 'd', chainKeys)

      let i = appendLink(merge(e, d), 'i', chainKeys)
      let j = appendLink(i, 'j', chainKeys)

      let k = appendLink(merge(h, j), 'k', chainKeys)
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
      let a = appendLink(root, 'a', chainKeys)
      let b = appendLink(a, 'b', chainKeys)
      let c = appendLink(b, 'c', chainKeys)
      let d = appendLink(c, 'd', chainKeys)
      let e = appendLink(d, 'e', chainKeys)
      let g = appendLink(e, 'g', chainKeys)
      let f = appendLink(d, 'f', chainKeys)
      let o = appendLink(merge(g, f), 'o', chainKeys)

      let h = appendLink(b, 'h', chainKeys)
      let i = appendLink(h, 'i', chainKeys)

      let j = appendLink(b, 'j', chainKeys)

      return merge(o, merge(i, j))
    }

    default:
      // ignore coverage
      throw new Error('unknown chain')
  }
}

export type XAction =
  | Action
  | {
      type: 'X'
      payload: string
    }
export type XLink = Link<XAction, {}>

export const appendLink = (chain: SignatureChain<XAction, any>, payload: string, chainKeys: KeysetWithSecrets) =>
  append({
    chain,
    action: { type: 'X', payload } as XAction,
    user: alice,
    chainKeys,
  })

export const trim = (s: string) => s.replace(/\s*/g, '')
