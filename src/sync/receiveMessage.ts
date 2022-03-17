import { SyncMessage, SyncState } from './types'
import { Action, merge, HashGraph } from '/chain'
import { decryptChain } from '/chain/decrypt'
import { KeysetWithSecrets } from '/keyset'
import { assert } from '/util'
import { validate } from '/validator'

/**
 * Receives a sync message from a peer and updates our sync state accordingly so that
 * `generateMessage` can determine what information they need. Also possibly updates our chain with
 * information from them.
 *
 * @returns A tuple `[chain, state]` containing our updated chain and our updated sync state with
 * this peer.
 * */
export const receiveMessage = <A extends Action, C>(
  /** Our current chain */
  chain: HashGraph<A, C>,

  /** Our sync state with this peer */
  prevState: SyncState,

  /** The sync message they've just sent */
  message: SyncMessage<A, C>,

  chainKeys: KeysetWithSecrets
): [HashGraph<A, C>, SyncState] => {
  const their = message

  // This should never happen, but just as a sanity check
  assert(chain.root === their.root, `Can't sync chains with different roots`)

  const state: SyncState = {
    ...prevState,
    their: {
      head: their.head,
      need: their.need || [],
      links: { ...prevState.their.links, ...their.links },
      linkMap: { ...prevState.their.linkMap, ...their.linkMap },
      reportedError: their.error,
    },
  }

  // if we've received links from them, try to reconstruct their chain and merge
  if (Object.keys(state.their.links).length) {
    // reconstruct their chain
    const head = their.head
    const encryptedLinks = { ...chain.encryptedLinks, ...state.their.links }
    const encryptedChain = { ...chain, head, encryptedLinks }
    const theirChain = decryptChain(encryptedChain, chainKeys)

    // merge with our chain
    const mergedChain = merge(chain, theirChain)

    // check the integrity of the merged chain
    const validation = validate(mergedChain)

    if (validation.isValid) {
      chain = mergedChain
    } else {
      // We only get here if we've received bad links from them — maliciously, or not. The
      // application should monitor `failedSyncCount` and decide not to trust them if it's too high.
      state.failedSyncCount += 1

      // Record the error so we can surface it in generateMessage
      state.our.reportedError = validation.error
    }

    // either way, we can discard all pending links
    state.their.links = {}
    state.their.linkMap = {}
  }

  return [chain, state]
}
