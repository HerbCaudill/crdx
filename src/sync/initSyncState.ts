import { SyncState } from './types'

export const initSyncState = (): SyncState => ({
  their: {
    head: [],
    encryptedLinks: {},
    need: [],
  },

  our: {
    head: [],
    links: [],
  },

  lastCommonHead: [],
  failedSyncCount: 0,
})
