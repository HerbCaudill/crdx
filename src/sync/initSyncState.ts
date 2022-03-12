import { SyncState } from './types'

export const initSyncState = (): SyncState => ({
  lastCommonHead: [],

  theirHead: [],
  theyHaveSent: [],
  links: {},
  theirRecentHashes: {},
  theirNeed: [],
  sendRecentHashes: false,

  ourHead: [],
  weHaveSent: [],
  ourRecentHashes: {},
})
