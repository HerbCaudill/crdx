import { asymmetric, signatures } from '@herbcaudill/crypto'
import { SyncMessage, SyncState } from './types'
import { Action, DependencyMap, merge, SignatureChain } from '/chain'
import { decryptChain } from '/chain/decrypt'
import { getChainMap, isComplete } from '/chain/recentLinks'
import { KeysetWithSecrets } from '/keyset'
import { assert } from '/util'

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
    sendMoreHashes = false,
    need = [],
  } = message

  // This should never happen, but just as a sanity check
  assert(chain.root === root, `Can't sync chains with different roots`)

  state.theirHead = head

  state.theyHaveSent = state.theyHaveSent.concat(Object.keys(links))

  // store the new links in state
  state.links = { ...state.links, ...links }

  // merge this set of recent hashes with any they've sent previously
  state.theirRecentHashes = {
    ...state.theirRecentHashes,
    ...recentHashes,
  }

  state.sendRecentHashes = sendMoreHashes
  state.theirNeed = need

  // if we can reconstruct their chain, do so and merge with ours

  // filter their recent hashes to only include ones we have the full link for
  const mapOfLinksTheySent = Object.keys(state.theirRecentHashes).reduce((result, hash) => {
    if (hash in state.links) {
      result[hash] = state.theirRecentHashes[hash]
    }
    return result
  }, {} as DependencyMap)

  const mergedChainMap = {
    ...getChainMap(chain), // everything we know about
    ...mapOfLinksTheySent, // links they've sent, along with their dependencies
  }
  const weHaveTheirHeads = !state.theirHead.some(h => !(h in chain.encryptedLinks || h in state.links))

  if (isComplete(mergedChainMap) && weHaveTheirHeads) {
    // we can reconstruct their chain
    chain = {
      ...chain,
      head: state.theirHead,
      encryptedLinks: {
        ...chain.encryptedLinks,
        ...state.links,
      },
    }

    // decrypt the links they've sent
    chain = decryptChain(chain, chainKeys)
  }

  state.ourHead = chain.head

  return [chain, state]
}
