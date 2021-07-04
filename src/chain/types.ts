﻿import { Member } from '@/member'
import { Base64, Hash, UnixTimestamp, ValidationResult } from '@/util/types'

export const ROOT = 'ROOT'
export const MERGE = 'MERGE'

export interface Action {
  /** Label identifying the type of action this link represents */
  type: unknown

  /** Payload of the action */
  payload: unknown
}

export type NonRootLinkBody<A extends Action> = A & {
  /** Hash of the previous link*/
  prev: Hash

  /** Context in which this link was authored (user, device, client) */
  user: Member

  /** Unix timestamp on device that created this link */
  timestamp: UnixTimestamp
}

export type RootLinkBody<A extends Action> = Omit<NonRootLinkBody<A>, 'prev'> & {
  type: typeof ROOT

  /** The root link is not linked to a previous link */
  prev: null
}

/** The part of the link that is signed */
export type LinkBody<A extends Action> = RootLinkBody<A> | NonRootLinkBody<A>

/** The full link, consisting of a body and a signature link */
export type SignedLink<B extends LinkBody<A>, A extends Action> = {
  /** Hash of this link */
  hash: Hash

  /** The part of the link that is signed & hashed */
  body: B

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

export type MergeLink = {
  type: typeof MERGE

  /** Hash of this link */
  hash: Hash

  /** Hashes of the two concurrent heads being merged */
  body: Hash[]
}

export type RootLink<A extends Action> = SignedLink<RootLinkBody<A>, A>
export type NonRootLink<A extends Action> = SignedLink<NonRootLinkBody<A>, A>

export type ActionLink<A extends Action> = NonRootLink<A> | RootLink<A> // excludes MergeLink

export type Link<A extends Action> = ActionLink<A> | MergeLink

export type LinkMap<A extends Action> = Record<Hash, Link<A>>

export interface SignatureChain<A extends Action> {
  root: Hash
  head: Hash
  links: LinkMap<A>
}

// type guards

export const isMergeLink = (o: Link<any>): o is MergeLink => {
  return o && 'type' in o && o.type === MERGE
}

export const isRootLink = <A extends Action>(o: Link<A>): o is RootLink<A> => {
  return !isMergeLink(o) && o.body.prev === null
}

export type Sequence<A extends Action> = ActionLink<A>[]

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
export type Sequencer<A extends Action = Action> = (a: Sequence<A>, b: Sequence<A>) => Sequence<A>

export type Validator = <A extends Action>(currentLink: Link<A>, chain: SignatureChain<A>) => ValidationResult

export type ValidatorSet = {
  [key: string]: Validator
}

export interface RootAction extends Action {
  type: typeof ROOT
  payload: {
    teamName: string
    rootUser: Member
  }
}

export type Branch = Sequence<Action>
export type TwoBranches = [Branch, Branch]
export type ActionFilter = (link: ActionLink<Action>) => boolean
export type ActionFilterFactory = (branches: TwoBranches, chain: SignatureChain<Action>) => ActionFilter
