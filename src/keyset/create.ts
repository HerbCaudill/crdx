import { randomKey } from '@/keyset/randomKey'
import { KeyScope, KeysetWithSecrets } from '@/keyset/types'
import { HashPurpose, Optional } from '@/util'
import { asymmetric, base64, hash, Key, signatures, stretch } from '@herbcaudill/crypto'

const { SIGNATURE, ENCRYPTION, SYMMETRIC } = HashPurpose

/** Generates a full set of per-user keys from a single 32-byte secret, roughly following the
 *  procedure outlined in the [Keybase docs on Per-User Keys](http://keybase.io/docs/teams/puk). */
export function create(
  /** The scope associated with the new keys - e.g. `{ type: TEAM }` or `{type: ROLE, name: ADMIN}`.  */
  scope: Optional<KeyScope, 'name'>,
  /** A strong secret key used to derive the other keys. This key should be randomly generated to
   * begin with and never stored. If not provided, a 32-byte random key will be generated and used. */
  seed: string = randomKey()
): KeysetWithSecrets {
  const { type, name = type } = scope
  const stretchedSeed = stretch(`${name}:${type}:${seed}`)
  return {
    type,
    name,
    generation: 0,
    signature: deriveSignatureKeys(stretchedSeed),
    encryption: deriveEncryptionKeys(stretchedSeed),
    secretKey: deriveSymmetricKey(stretchedSeed),
  }
}

// private

const deriveSignatureKeys = (secretKey: Key) => {
  const derivedSeed = base64.encode(hash(SIGNATURE, secretKey).slice(0, 32))
  return signatures.keyPair(derivedSeed)
}

const deriveEncryptionKeys = (secretKey: Key) => {
  const derivedSecretKey = base64.encode(hash(ENCRYPTION, secretKey).slice(0, 32))
  return asymmetric.keyPair(derivedSecretKey)
}

const deriveSymmetricKey = (secretKey: Key) => {
  const derivedKey = hash(SYMMETRIC, secretKey)
  return base64.encode(derivedKey)
}
