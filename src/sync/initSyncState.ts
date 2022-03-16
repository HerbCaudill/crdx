import { SyncState } from './types'

export const initSyncState = (): SyncState => ({
  their: {
    head: [],
    links: {},
    need: [],
  },

  weSent: {
    links: [],
  },

  lastCommonHead: [],
  failedSyncCount: 0,
})
