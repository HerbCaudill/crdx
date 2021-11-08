﻿import { User } from '/user'
import { Base58, Hash, UnixTimestamp } from '/util/types'
import { ROOT, MERGE } from '/constants'
import { LinkComparator } from './topoSort'

/////////////////// SIGNATURE CHAIN, LINKS, ACTIONS

/** A signature chain is an acyclic directed graph of links. Each link is **cryptographically
 * signed** by the author, and includes a **hash of the parent link**.
 *
 * This means that the chain is **append-only**: Existing nodes can’t be modified, reordered, or
 * removed without causing the hash and signature checks to fail.
 *
 * A signature chain is just data and can be stored as JSON. It consists of a hash table of the
 * links themselves, plus a pointer to the **root** (the “founding” link added when the chain was
 * created) and the **head** (the most recent link we know about).
 */
export interface SignatureChain<A extends Action, C> {
  /** Hash of the root link (the "founding" link added when the chain was created) */
  root: Hash

  /** Hash of the head link (the most recent link we know about) */
  head: Hash[]

  /** Hash table of all the links we know about */
  links: LinkMap<A, C>
}

/** A `LinkMap` is a hash table of links */
export type LinkMap<A extends Action, C> = Record<Hash, Link<A, C>>

// TODO: could we simplify this further by making the `prev` element for ROOT an empty array?

/** There are two types of links:
 * - a `RootLink` is a special type of action link that has type 'ROOT' and no `prev` element
 * - an `ActionLink` is a normal link
 */
export type Link<A extends Action, C> = RootLink<C> | ActionLink<A, C>

/** The full link, consisting of a body and a signature block */
export type SignedLink<A extends Action, C> = {
  /** Hash of this link */
  hash: Hash

  /** The part of the link that is signed & hashed */
  body: LinkBody<A, C>

  /** The signature block (signature, name, and key) */
  signed: {
    /** NaCL-generated base58 signature of the link's body */
    signature: Base58

    /** The username (or ID or email) of the person signing the link */
    userName: string

    /** The public half of the key used to sign the link, in base58 encoding */
    key: Base58
  }
}

/** The `LinkBody` adds contextual information to the `Action`. This is the part of the link that is signed */
export type LinkBody<A extends Action, C> = A extends RootAction ? RootLinkBody : ActionLinkBody<A, C>

/** An `Action` is analogous to a Redux action: it has a string label (e.g. 'ADD_USER' or 'INCREMENT')
 * and a payload that can contain anything.
 */
export interface Action {
  /** Label identifying the type of action this link represents */
  type: string

  /** Payload of the action */
  payload: any
}

/////////////////// ACTION LINKS

/** An action link has three parts:
 *
 * - `body`: the action's `type` and `payload`, the local user's name and keys, a timestamp, and the
 *   hash of the preceding link.
 * - `hash`: a cryptographic hash of the body
 * - `signed`: a cryptographic signature of the body
 *
 * @example
 * ```ts
 * const example_action: ActionLink<SomeAction> = {
 *   body: {
 *     type: 'SOME_ACTION',
 *     payload: {
 *       something: {},
 *       somethingElse: {},
 *     },
 *     user: alice,
 *     timestamp: 1625483593289,
 *     prev: 'DcKrkYgFtKIv13VmkKyEv2S4',
 *   },
 *   signed: {
 *   hash: 'F0tTf04UOCexC6yMsBJTsUYr',
 *     userName: 'alice',
 *     signature: 'Wev5XI1Kr5VC0nYhUOamRdpp',
 *     key: 'w5Cu6PUO6YqptRfNrO9utQO6',
 *   },
 * }
 * ```
 */
export type ActionLink<A extends Action, C> = SignedLink<A, C>

/** An `ActionLinkBody` includes a hash of the previous link. */
export type ActionLinkBody<A extends Action, C> = A &
  C & {
    /** User who authored this link */
    user: User

    /** Unix timestamp on device that created this link */
    timestamp: UnixTimestamp

    /** Head(s) of the chain when this link was added */
    prev: Hash[]
  }

// ROOT LINKS

/** A root link is a special instance of an `ActionLink` that has no `prev` element in the body
 * (since it has no predecessor) and has type 'ROOT'.
 *
 * @example
 * ```ts
 * const example_root: RootLink = {
 *   hash: 'DcKrkYgFtKIv13VmkKyEv2S4',
 *   signed: {
 *     userName: 'alice',
 *     signature: '3eDKQ5J22zpSR4HFmAQa9r0N',
 *     key: 'w5Cu6PUO6YqptRfNrO9utQO6',
 *   },
 *   body: {
 *     type: ROOT,
 *     payload: {
 *       name: 'Spies R Us',
 *       id: 'TJEJ5w83vy4meH0blRWbGcBN',
 *     },
 *     user: alice,
 *     timestamp: 1625483593289,
 *   },
 * }
 * ```
 */
export type RootLink<C> = SignedLink<RootAction, C>

export interface RootAction {
  type: 'ROOT'
  payload: any
}

/** The `RootLinkBody` is just like the `ActionLinkBody` except that it has no `prev` element. */
export type RootLinkBody = RootAction & {
  /** User who authored this link */
  user: User

  /** Unix timestamp on device that created this link */
  timestamp: UnixTimestamp
}

// TYPE GUARDS

export const isRootLink = (link: Link<any, any>): link is RootLink<any> => {
  return 'type' in link.body && link.body.type === ROOT
}

export const isActionLink = <A extends Action, C>(link: Link<A, C>): link is ActionLink<A, C> => {
  return 'prev' in link.body
}

/////////////////// SEQUENCES

/** A `Sequence` is a topological sort of a signature chain (or a portion thereof). */
export type Sequence<A extends Action, C> = Link<A, C>[]

export type Resolver<A extends Action, C> = (
  chain: SignatureChain<A, C>
) => {
  sort?: LinkComparator
  filter?: (link: Link<A, C>) => boolean
}
