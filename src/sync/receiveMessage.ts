import { SyncMessage, SyncState } from './types'
import { Action, DependencyMap, merge, SignatureChain } from '/chain'
import { decryptChain } from '/chain/decrypt'
import { getChainMap, isComplete } from '/chain/recentLinks'
import { KeysetWithSecrets } from '/keyset'
import { assert, Hash, truncateHashes } from '/util'
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
  chain: SignatureChain<A, C>,

  /** Our sync state with this peer */
  state: SyncState,

  /** The sync message they've just sent */
  message: SyncMessage<A, C>,

  chainKeys: KeysetWithSecrets
): [SignatureChain<A, C>, SyncState] => {
  const { our: their, weNeed: theyNeed } = message

  // This should never happen, but just as a sanity check
  assert(chain.root === their.root, `Can't sync chains with different roots`)

  state.their.head = their.head

  // store the new links in state
  state.their.links = { ...state.their.links, ...their.links }

  // merge this set of recent hashes with any they've sent previously
  const theirLinkMap = {
    ...state.their.linkMap,
    ...their.linkMap,
  }

  state.theyNeed.moreLinkMap = theyNeed.moreLinkMap
  state.theyNeed.links = theyNeed.links || []

  // if they've sent new links and we have a full picture of their chain, try to merge it with ours

  const pendingHashes = Object.keys(state.their.links)
  if (pendingHashes.length) {
    // make a dependency map of the pending links
    const mapOfPendingLinks: DependencyMap = pendingHashes.reduce(
      (linkMap, hash) => ({ ...linkMap, [hash]: theirLinkMap[hash] }),
      {}
    )

    // we'll combine that with a dependency map of our own chain
    const mapOfOurChain: DependencyMap = getChainMap(chain)

    // are there any hashes we don't know about?
    const weHaveTheirFullChain = isComplete({ ...mapOfOurChain, ...mapOfPendingLinks })

    if (weHaveTheirFullChain) {
      // there are no gaps — we can reconstruct their chain
      const theirChain = {
        ...chain,
        head: state.their.head,
        encryptedLinks: {
          ...chain.encryptedLinks,
          ...state.their.links,
        },
      }

      // decrypt encrypted links
      const theirDecryptedChain = decryptChain(theirChain, chainKeys)

      // merge with our chain
      const mergedChain = merge(chain, theirDecryptedChain)

      // check the integrity of the merged chain
      const validation = validate(mergedChain)
      if (validation.isValid) {
        chain = mergedChain
      } else {
        // when we end up with invalid input from a peer, there are a few different things we need
        // to do in order to heal the chain and react appropriately to a possibly malicious peer.
        //
        // 1. Throw out all the information we've received from them
        // 2. Increment some kind of counter that indicates that we've rejected their input, and use
        //    that to throttle them? Ask the user if we should try again?
        // 3. Make it clear to the next level up that we've gotten bad input so they can react (e.g.
        //    to Connection so it can send an appropriate message to the peer). Add an optional
        //    error to the return value?
      }

      // either way, we can discard all pending links
      state.their.links = {}
    }
  }

  state.our.head = chain.head
  state.their.linkMap = theirLinkMap

  return [chain, state]
}
