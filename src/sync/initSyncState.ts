import { SyncState } from './types'

export const initSyncState = (): SyncState => ({
  lastCommonHead: [],

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
})
