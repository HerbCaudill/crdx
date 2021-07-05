import { User } from '@/user'
import { Base64, Hash, UnixTimestamp, ValidationResult } from '@/util/types'

export const ROOT = 'ROOT'
export const MERGE = 'MERGE'

/**
 *  A signature chain is an acyclic directed graph of links. Each link is **cryptographically
 * signed** by the author, and includes a **hash of the parent link**.
 *
 * This means that the chain is **append-only**: Existing nodes can’t be modified, reordered, or
 * removed without causing the hash and signature checks to fail.
 *
 * A signature chain is just data and can be stored as JSON. It consists of a hash table of the
 * links themselves, plus a pointer to the **root** (the “founding” link added when the chain was
 * created) and the **head** (the most recent link we know about).
 */
export interface SignatureChain<A extends Action> {
  /** Hash of the root link (the "founding" link added when the chain was created) */
  root: Hash

  /** Hash of the head link (the most recent link we know about) */
  head: Hash

  /** Hash table of all the links we know about */
  links: LinkMap<A>
}

/** Hash table of links */
export type LinkMap<A extends Action> = Record<Hash, Link<A>>

/**
 * An `Action` is analogous to a Redux action: it has a string label (e.g. 'ADD_USER' or 'INCREMENT')
 * and a payload that can contain anything.
 */
export interface Action {
  /** Label identifying the type of action this link represents */
  type: any

  /** Payload of the action */
  payload: any
}

/**
 * There are three types of links:
 * - an `ActionLink` is a normal link
 * - a `RootLink` is a special type of action link that has type 'ROOT' and no `prev` element
 * - a `MergeLink` is a special marker that has no content of its own and just points back to two parent links
 *
 * A `Link` could be any of these three.
 */
export type Link<A extends Action> = RootLink | ActionLink<A> | MergeLink

/**
 * An action link has three parts:
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
 *   hash: 'F0tTf04UOCexC6yMsBJTsUYr',
 *   signed: {
 *     userName: 'alice',
 *     signature: 'Wev5XI1Kr5VC0nYhUOamRdpp',
 *     key: 'w5Cu6PUO6YqptRfNrO9utQO6',
 *   },
 * }
 * ```
 */
export type ActionLink<A extends Action> = A extends RootAction ? never : SignedLink<A> // excludes RootLink

/** The part of the link that is signed */
export type ActionLinkBody<A extends Action> = A & {
  /** User who authored this link */
  user: User

  /** Unix timestamp on device that created this link */
  timestamp: UnixTimestamp

  /** Hash of the previous link */
  prev: Hash
}

export type LinkBody<A extends Action> = A extends RootAction ? RootLinkBody : ActionLinkBody<A>

/** The full link, consisting of a body and a signature link */
export type SignedLink<A extends Action> = {
  /** Hash of this link */
  hash: Hash

  /** The part of the link that is signed & hashed */
  body: A extends RootAction ? RootLinkBody : ActionLinkBody<A>

  /** The signature block (signature, name, and key) */
  signed: {
    /** NaCL-generated base64 signature of the link's body */
    signature: Base64

    /** The username (or ID or email) of the person signing the link */
    userName: string

    /** The public half of the key used to sign the link, in base64 encoding */
    key: Base64
  }
}

/**
 * A root link is a special instance of an `ActionLink` that has no `prev` element in the body
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
export type RootLink = SignedLink<RootAction>

export interface RootAction extends Action {
  type: typeof ROOT
  payload: {
    /** Human-facing name of the document */
    name: string

    /** Unique ID of the document, typically a UUID */
    id: string
  }
}

export type RootLinkBody = RootAction & {
  /** User who authored this link */
  user: User

  /** Unix timestamp on device that created this link */
  timestamp: UnixTimestamp
}

/**
 *  Merge links are analogous to a git merge commit; they have no content of their own. The body is
 *  just an array of the two heads being merged
 *
 * @example
 * ```ts
 * const example_merge: MergeLink = {
 *   type: 'MERGE',
 *   hash: 'W83AYab2n2NhWo4dEVDr4O4z',
 *   body: ['DdPwc9xhLgU6l5DZhunqxTXK', 'NuBx3niq9aQKM1AyB7f3Mlt7'],
 * }
 * ```
 */
export type MergeLink = {
  type: typeof MERGE

  /** Hash of this link's body */
  hash: Hash

  /** Hashes of the two concurrent heads being merged */
  body: Hash[]
}

/** A `NonMergeLink` is either a RootLink or an ActionLink. */
export type NonMergeLink<A extends Action> = RootLink | ActionLink<A> // excludes MergeLink

// sequences

/** A `Sequence` is a topological sort of a signature chain (or a portion thereof). It has no merge links because all merges have been resolved. */
export type Sequence<A extends Action> = NonMergeLink<A>[]

/**
 * A resolver takes two heads and the chain they're in, and returns a single sequence combining the
 * two while applying any logic regarding which links to discard in case of conflict.
 */
export type Resolver<A extends Action = Action> = (
  branches: [Link<A>, Link<A>],
  chain: SignatureChain<A>
) => [Sequence<A>, Sequence<A>]

/**
 * A sequencer takes two sequences, and returns a single sequence combining the two
 * while applying any logic regarding which links take precedence.
 */
export type Sequencer = <A extends Action>(a: Sequence<A>, b: Sequence<A>) => Sequence<A>

export type ActionFilter = <A extends Action>(link: NonMergeLink<A>) => boolean
export type ActionFilterFactory = <A extends Action>(
  branches: [Sequence<A>, Sequence<A>],
  chain: SignatureChain<Action>
) => ActionFilter

// validators

export type Validator = <A extends Action>(currentLink: Link<A>, chain: SignatureChain<A>) => ValidationResult

export type ValidatorSet = {
  [key: string]: Validator
}

// type guards

export const isMergeLink = <A extends Action>(link: Link<A>): link is MergeLink => {
  return link && 'type' in link && link.type === MERGE
}

export const isRootLink = <A extends Action>(link: Link<A>): link is RootLink => {
  return !isMergeLink(link) && link.body.type === ROOT
}
