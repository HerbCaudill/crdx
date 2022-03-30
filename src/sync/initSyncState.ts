import { SyncState } from './types'

export const initSyncState = (): SyncState => ({
  their: {
    head: [],
    links: {},
    need: [],
  },

  our: {
    head: [],
    links: [],
  },

  lastCommonHead: [],
  failedSyncCount: 0,
})
