import { User } from '/user'
import { Base58, Hash, UnixTimestamp } from '/util/types'

/**
 * A signature chain is an acyclic directed graph of links. Each link is **cryptographically
 * signed** by the author, and includes a **hash of the parent link**.
 *
 * This means that the chain is **append-only**: Existing nodes can’t be modified, reordered, or
 * removed without causing the hash and signature checks to fail.
 *
 * A signature chain is just data and can be stored as JSON. It consists of a hash table of the
 * links themselves, plus a pointer to the **root** (the “founding” link added when the chain was
 * created) and the **head** (the most recent link we know about).
 *
 * The `SignatureChain` interface takes two parameters:
 *
 * - `A` is the Action type — typically a union of various `type` labels (e.g. 'ADD_CONTACT')
 *   along with the interface of the payload associated with each one.
 * - `C` is the Context interface — by default this is an empty interface, but might contain information
 *   about the context in which a link is added (e.g. a device ID, or the version of the application)
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

/** A link consists of a body, as well as a hash and a signature calculated from the body. */
export type Link<A extends Action, C> = {
  /** Hash of the body */
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

  isInvalid?: boolean
}

export interface RootAction {
  type: 'ROOT'
  payload: any
}

/** An `Action` is analogous to a Redux action: it has a string label (e.g. 'ADD_USER' or 'INCREMENT')
 * and a payload that can contain anything.
 */
export type Action =
  | RootAction
  | {
      /** Label identifying the type of action this link represents */
      type: string

      /** Payload of the action */
      payload: any
    }

/** The `LinkBody` adds contextual information to the `Action`. This is the part of the link that is signed */
export type LinkBody<A extends Action, C> = {
  /** User who authored this link */
  user: User

  /** Unix timestamp on device that created this link */
  timestamp: UnixTimestamp

  /** Head(s) of the chain when this link was added */
  prev: Hash[]
} & A & // plus everything from the action interface
  C // plus everything from the context interface

/** A `Sequence` is a topological sort of a signature chain (or a portion thereof). */
export type Sequence<A extends Action, C> = Link<A, C>[]

/** Any function that takes two links and tells us which comes first can be used as a comparator. */
export type LinkComparator = <A extends Action, C>(a: Link<A, C>, b: Link<A, C>) => number

/**
 * A resolver encapsulates the logic for merging concurrent branches. It takes the chain as an
 * argument, and returns two functions:
 * - `sort` is a comparator function that indicates how concurrent branches are to be ordered.
 * - `filter` is a predicate function that indicates which links to include in the resulting
 *   sequence.
 *
 * Suppose you have two concurrent branches `[e, g]` and `[f]`. One resolver might just concatenate
 * the two branches in arbitrary order, resulting in `[e,g,f]` or `[f,e,g]`. Another resolver might
 * return the links in a different order, and/or omit some links; so these concurrent branches might
 * also be resolved as:
 * ```
 *   [e, g, f]
 *   [e, f, g]
 *   [e, g]
 *   [f, g]
 *   [f]
 * ```
 */
export type Resolver<A extends Action, C> = (chain: SignatureChain<A, C>) => {
  sort?: LinkComparator
  filter?: (link: Link<A, C>) => boolean
}
