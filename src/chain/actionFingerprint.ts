import { Action, isActionLink, isMergeLink, isRootLink, Link } from '@/chain/types'

/** Identifies a unique action for the purpose of detecting duplicates;
 * e.g. ADD_USER:bob
 */
export const actionFingerprint = <A extends Action>(link: Link<A>) => {
  if (isActionLink(link)) {
    const fingerprintPayload = (action: A) => {
      switch (action.type) {
        default:
          return JSON.stringify(action.payload)
      }
    }
    return `${link.body.type}:${fingerprintPayload(link.body as A)}`
  }
  if (isMergeLink(link)) return 'MERGE'
  if (isRootLink(link)) return 'ROOT'
  throw new Error()
}
