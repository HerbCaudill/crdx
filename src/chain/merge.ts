﻿import { hashLink } from './hashLink'
import { isPredecessor } from './predecessors'
import { Action, MergeLink, SignatureChain } from './types'
import { Hash } from '/util'
import { getHead } from './getHead'

export const merge = <A extends Action, C>(a: SignatureChain<A, C>, b: SignatureChain<A, C>): SignatureChain<A, C> => {
  if (a.root !== b.root) throw new Error('Cannot merge two chains with different roots')

  const root = a.root
  const links = { ...a.links, ...b.links }

  let head: Hash[] = []

  // TODO sort this out

  // if (arraysAreEqual(a.head, b.head)) {
  //   // they're the same
  //   head = a.head
  // } else if (b.head in a.links && isPredecessor(a, a.links[b.head], getHead(a))) {
  //   // a is ahead of b; fast forward
  //   head = a.head
  // } else if (a.head in b.links && isPredecessor(b, b.links[a.head], getHead(b))) {
  //   // b is ahead of a; fast forward
  //   head = b.head
  // } else {
  //   const mergeLink = createMergeLink(a.head, b.head)

  //   // add this link as the new head
  //   head = mergeLink.hash

  //   links[mergeLink.hash] = mergeLink
  // }
  const merged: SignatureChain<A, C> = { root, head, links }

  return merged
}

/** Returns a merge link, which has no content other than a pointer to each of the two heads */
export const createMergeLink = (a: Hash, b: Hash) => {
  const body = [a, b].sort() // ensure deterministic order
  const hash = hashLink(body)
  return { type: 'MERGE', hash, body: body } as MergeLink
}

const arraysAreEqual = (a: any[], b: any[]) => {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
  return true
}
