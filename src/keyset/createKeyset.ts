import { initCrypto } from '@herbcaudill/crypto'
import { randomKey } from './randomKey'
import { KeyScope, KeysetWithSecrets } from './types'
import { HashPurpose } from '/constants'
import { Optional } from '/util'

const { SIGNATURE, ENCRYPTION, SYMMETRIC } = HashPurpose

/** Generates a full set of per-user keys from a single 32-byte secret, roughly following the
 *  procedure outlined in the [Keybase docs on Per-User Keys](http://keybase.io/docs/teams/puk).
 * */
export const createKeyset = async (
  /** The scope associated with the new keys - e.g. `{ type: TEAM }` or `{type: ROLE, name: ADMIN}`.  */
  scope: Optional<KeyScope, 'name'>,

  /** A strong secret key used to derive the other keys. This key should be randomly generated to
   *  begin with and never stored. If not provided, a 32-byte random key will be generated and used. */
  seed?: string
): Promise<KeysetWithSecrets> => {
  const { hash, asymmetric, signatures, stretch } = await initCrypto()
  const { type, name = type } = scope
  seed = seed ?? (await randomKey())
  const stretchedSeed = stretch(`${name}:${type}:${seed}`)
  return {
    type,
    name,
    generation: 0,
    signature: signatures.keyPair(hash(SIGNATURE, stretchedSeed).slice(0, 32)),
    encryption: asymmetric.keyPair(hash(ENCRYPTION, stretchedSeed).slice(0, 32)),
    secretKey: hash(SYMMETRIC, stretchedSeed),
  }
}

// private
