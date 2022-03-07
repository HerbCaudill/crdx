import { Base58, Base58Keypair } from '@herbcaudill/crypto'

export const CHAIN = 'CHAIN'
export const TEAM = 'TEAM'
export const ROLE = 'ROLE'
export const USER = 'USER'
export const DEVICE = 'DEVICE'
export const EPHEMERAL = 'EPHEMERAL'

// avoiding enums https://maxheiber.medium.com/alternatives-to-typescript-enums-50e4c16600b1
export const KeyType = { CHAIN, TEAM, ROLE, USER, DEVICE, EPHEMERAL } as const
export type KeyType = typeof KeyType[keyof typeof KeyType]

/**
 * Represents the scope of a keyset. Could be:
 * - a specific user: `{type: USER, name: 'alice'}`
 * - a single-use keyset: `{type: EPHEMERAL, name: EPHEMERAL}`
 */
export interface KeyScope {
  type: KeyType
  name: string
}

export interface KeyMetadata extends KeyScope {
  generation: number
}

export interface Keyset extends KeyMetadata {
  encryption: Base58 // = encryption.publicKey
  signature: Base58 // = signature.publicKey
}

export interface KeysetWithSecrets extends KeyMetadata {
  secretKey: Base58 // for symmetric encryption
  encryption: Base58Keypair // for asymmetric encryption
  signature: Base58Keypair
}

// type guard: Keyset vs KeysetWithSecrets
export const hasSecrets = (keys: Keyset | KeysetWithSecrets): keys is KeysetWithSecrets =>
  keys.encryption.hasOwnProperty('secretKey') && keys.signature.hasOwnProperty('secretKey') && 'secretKey' in keys

// type guard: KeysetWithSecrets vs. KeyScope
export const isKeyset = (k: KeysetWithSecrets | KeyScope): k is KeysetWithSecrets =>
  'secretKey' in k && //
  'encryption' in k &&
  'signature' in k
