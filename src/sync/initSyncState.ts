import { SyncState } from './types'

export const initSyncState = (): SyncState => ({
  their: {
    head: [],
    links: {},
  },
  theyNeed: {
    links: [],
    moreLinkMap: true,
  },
  our: {
    head: [],
  },

  lastCommonHead: [],
  failedSyncCount: 0,
})
