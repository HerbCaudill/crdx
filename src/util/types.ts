import type { Base58 } from '@herbcaudill/crypto'

export type { Base58, Utf8 } from '@herbcaudill/crypto'

export type UnixTimestamp = number
export type Hash = Base58
export type SemVer = string
export type Payload = string | Uint8Array | object
export type UUID = string

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<T>
