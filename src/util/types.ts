export type UnixTimestamp = number
export type Utf8 = string
export type Base58 = string
export type Hash = Base58
export type SemVer = string
export type Key = Utf8 | Uint8Array
export type Payload = Base58 | Uint8Array | object

export type Encrypted<T> = Base58

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<T>
