import { SyncState } from './types'

export const initSyncState = (): SyncState => ({
  lastCommonHead: [],
  ourHead: [],
  theirHead: [],
  ourNeed: [],
  theirNeed: [],
  weHaveSent: [],
  theyHaveSent: [],
  pendingLinks: {},
})
