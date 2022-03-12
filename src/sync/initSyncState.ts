import { SyncState } from './types'

export const initSyncState = (): SyncState => ({
  lastCommonHead: [],
  theirHead: [],
  pendingLinks: {},
  theirNeed: [],
  sendRecentHashes: true,
  ourHead: [],
})
