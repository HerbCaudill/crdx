import { result } from 'lodash'
import { SyncMessage, SyncState } from './types'
import { Action, DependencyMap, merge, SignatureChain } from '/chain'
import { decryptChain } from '/chain/decrypt'
import { getChainMap, isComplete } from '/chain/recentLinks'
import { KeysetWithSecrets } from '/keyset'
import { assert, Hash, truncateHashes } from '/util'

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
  chain: SignatureChain<A, C>,

  /** Our sync state with this peer */
  state: SyncState,

  /** The sync message they've just sent */
  message: SyncMessage<A, C>,

  chainKeys: KeysetWithSecrets
): [SignatureChain<A, C>, SyncState] => {
  const {
    root, //
    head,
    links = {},
    recentHashes = {},
    sendMoreHashes = true,
    need = [],
  } = message

  // This should never happen, but just as a sanity check
  assert(chain.root === root, `Can't sync chains with different roots`)

  state.theirHead = head

  // store the new links in state
  state.pendingLinks = { ...state.pendingLinks, ...links }

  // merge this set of recent hashes with any they've sent previously
  const theirDependencyMap = {
    ...state.theirDependencyMap,
    ...recentHashes,
  }

  state.sendRecentHashes = sendMoreHashes
  state.theirNeed = need

  // if we can reconstruct their chain, do so and merge with ours

  const pendingHashes = Object.keys(state.pendingLinks)
  if (pendingHashes.length) {
    // make a dependency map of the pending links
    const lookupDependencies = (r: DependencyMap, h: Hash) => ({ ...r, [h]: theirDependencyMap[h] })
    const mapOfPendingLinks: DependencyMap = pendingHashes.reduce(lookupDependencies, {})

    // we'll combine that with a dependency map of our own chain
    const mapOfOurChain: DependencyMap = getChainMap(chain)

    // are there any hashes we don't know about?
    if (isComplete({ ...mapOfOurChain, ...mapOfPendingLinks })) {
      // there are no gaps — we can reconstruct their chain
      const theirChain = {
        ...chain,
        head: state.theirHead,
        encryptedLinks: {
          ...chain.encryptedLinks,
          ...state.pendingLinks,
        },
      }
      // decrypt encrypted links
      const theirDecryptedChain = decryptChain(theirChain, chainKeys)

      // merge with our chain
      chain = merge(chain, theirDecryptedChain)
    }
  }

  state.ourHead = chain.head
  state.theirDependencyMap = theirDependencyMap

  return [chain, state]
}
