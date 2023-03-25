﻿import { Base58, Base58Keypair } from '@herbcaudill/crypto'

export const KeyType = {
  GRAPH: 'GRAPH',
  USER: 'USER',
} as const
export type KeyType = typeof KeyType[keyof typeof KeyType]

/**
 * Represents the scope of a keyset. Could be:
 * - a specific user: `{type: USER, name: 'alice'}`
 * - a single-use keyset: `{type: EPHEMERAL, name: EPHEMERAL}`
 */
export interface KeyScope {
  type: string // not restricted to KeyType because apps will have their own types
  name: string
}

export interface KeyMetadata extends KeyScope {
  generation: number
}

/**
 * A Keyset contains one secret key for symmetric encryption, as well as two keypairs, for
 * asymmetric encryption and signatures, respectively
 * */
export interface KeysetWithSecrets extends KeyMetadata {
  secretKey: Base58 // for symmetric encryption
  encryption: Base58Keypair // for asymmetric encryption
  signature: Base58Keypair
}

/** A Keyset contains the public encryption and signature keys from a KeysetWithSecrets */
export interface Keyset extends KeyMetadata {
  encryption: Base58 // = encryption.publicKey
  signature: Base58 // = signature.publicKey
}

/** Type guard: Keyset vs KeysetWithSecrets  */
export const hasSecrets = (keys: Keyset | KeysetWithSecrets): keys is KeysetWithSecrets =>
  keys.encryption.hasOwnProperty('secretKey') && keys.signature.hasOwnProperty('secretKey') && 'secretKey' in keys

/** Type guard: KeysetWithSecrets vs anything else */
export const isKeyset = (k: Object): k is KeysetWithSecrets =>
  k !== undefined && //
  'secretKey' in k &&
  'encryption' in k &&
  'signature' in k

/**
 * A Keyring is a dictionary of keysets (including secrets), indexed by the public part of the
 * assymetric encryption key
 * */
export type Keyring = Record<string, KeysetWithSecrets>

/** Type guard: Keyring vs KeysetWithSecrets  */
export const isKeyring = (k: Keyring | KeysetWithSecrets | KeysetWithSecrets[]): k is Keyring =>
  !Array.isArray(k) && !isKeyset(k)
