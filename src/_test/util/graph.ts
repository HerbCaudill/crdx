import { append } from '/graph/append'
import { createGraph } from '/graph/createGraph'
import { merge } from '/graph/merge'
import { Action, Link, LinkBody, HashGraph } from '/graph/types'
import { KeysetWithSecrets } from '/keyset'
import { setup, TEST_GRAPH_KEYS as graphKeys } from '/test/util/setup'

const { alice } = setup('alice')

export const getPayloads = (sequence: Link<XAction, any>[]) =>
  sequence //
    .filter(link => link.body.prev.length) // omit root link
    .filter(link => link.isInvalid !== true) // omit invalid links
    .map(link => (link.body as LinkBody<XAction, any>).payload) // pull out payloads
    .join('') // return as single string

export const findByPayload = (graph: HashGraph<XAction, any>, payload: XAction['payload']) => {
  const links = Object.values(graph.links)
  return links.find(n => n.body.payload === payload) as Link<XAction, any>
}

// ignore coverage
export const byPayload = (a: Link<XAction, any>, b: Link<XAction, any>) => {
  return a.body.payload < b.body.payload ? -1 : a.body.payload > b.body.payload ? 1 : 0
}

export const buildGraph = (type: string) => {
  let root = createGraph<XAction>({ user: alice, name: 'root', graphKeys })
  switch (trim(type)) {
    // one link
    case 'a': {
      let a = appendLink(root, 'a', graphKeys)
      return a
    }

    // no branches
    case trim(`a ─ b ─ c`): {
      let a = appendLink(root, 'a', graphKeys)
      let b = appendLink(a, 'b', graphKeys)
      let c = appendLink(b, 'c', graphKeys)
      return c
    }

    // simple open
    case trim(`
            ┌─ b
         a ─┤
            └─ c
      `): {
      let a = appendLink(root, 'a', graphKeys)
      let b = appendLink(a, 'b', graphKeys)
      let c = appendLink(a, 'c', graphKeys)
      return merge(b, c)
    }

    // simple closed
    case trim(`
            ┌─ b ─ c ─┐
         a ─┤         ├─ e   
            └─── d ───┘

      `): {
      let a = appendLink(root, 'a', graphKeys)
      let b = appendLink(a, 'b', graphKeys)
      let c = appendLink(b, 'c', graphKeys)
      let d = appendLink(a, 'd', graphKeys)
      let e = appendLink(merge(c, d), 'e', graphKeys)
      return e
    }

    // double closed
    case trim(`
            ┌─ b ─ c ─┐     ┌─ f ─ g ─┐
         a ─┤         ├─ e ─┤         ├─ i    
            └─── d ───┘     └─── h ───┘

      `): {
      let a = appendLink(root, 'a', graphKeys)
      let b = appendLink(a, 'b', graphKeys)
      let c = appendLink(b, 'c', graphKeys)
      let d = appendLink(a, 'd', graphKeys)
      let e = appendLink(merge(c, d), 'e', graphKeys)
      let f = appendLink(e, 'f', graphKeys)
      let g = appendLink(f, 'g', graphKeys)
      let h = appendLink(e, 'h', graphKeys)
      let i = appendLink(merge(g, h), 'i', graphKeys)
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
      let a = appendLink(root, 'a', graphKeys)
      let b = appendLink(a, 'b', graphKeys)
      let c = appendLink(b, 'c', graphKeys)
      let d = appendLink(c, 'd', graphKeys)
      let e = appendLink(d, 'e', graphKeys)
      let g = appendLink(e, 'g', graphKeys)

      let f = appendLink(d, 'f', graphKeys)

      let h = appendLink(b, 'h', graphKeys)
      let i = appendLink(h, 'i', graphKeys)

      let j = appendLink(b, 'j', graphKeys)
      let k = appendLink(j, 'k', graphKeys)
      let l = appendLink(k, 'l', graphKeys)

      let o = appendLink(merge(g, merge(f, i)), 'o', graphKeys)

      let n = appendLink(merge(o, l), 'n', graphKeys)
      return n
    }

    // tricky
    case trim(`
                          ┌─── h ────┐
                ┌─ c ─ e ─┤          ├─ k
         a ─ b ─┤         └── i ─ j ─┘
                └── d ────────┘
      `): {
      let a = appendLink(root, 'a', graphKeys)
      let b = appendLink(a, 'b', graphKeys)
      let c = appendLink(b, 'c', graphKeys)
      let e = appendLink(c, 'e', graphKeys)
      let h = appendLink(e, 'h', graphKeys)

      let d = appendLink(b, 'd', graphKeys)

      let i = appendLink(merge(e, d), 'i', graphKeys)
      let j = appendLink(i, 'j', graphKeys)

      let k = appendLink(merge(h, j), 'k', graphKeys)
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
      let a = appendLink(root, 'a', graphKeys)
      let b = appendLink(a, 'b', graphKeys)
      let c = appendLink(b, 'c', graphKeys)
      let d = appendLink(c, 'd', graphKeys)
      let e = appendLink(d, 'e', graphKeys)
      let g = appendLink(e, 'g', graphKeys)
      let f = appendLink(d, 'f', graphKeys)
      let o = appendLink(merge(g, f), 'o', graphKeys)

      let h = appendLink(b, 'h', graphKeys)
      let i = appendLink(h, 'i', graphKeys)

      let j = appendLink(b, 'j', graphKeys)

      return merge(o, merge(i, j))
    }

    default:
      // ignore coverage
      throw new Error('unknown graph')
  }
}

export type XAction =
  | Action
  | {
      type: 'X'
      payload: string
    }
export type XLink = Link<XAction, {}>

export const appendLink = (graph: HashGraph<XAction, any>, payload: string, graphKeys: KeysetWithSecrets) =>
  append({
    graph,
    action: { type: 'X', payload } as XAction,
    user: alice,
    graphKeys,
  })

export const trim = (s: string) => s.replace(/\s*/g, '')
