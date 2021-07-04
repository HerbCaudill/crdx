import { Action, ActionLink, isRootLink } from '@/chain/types'

/** Identifies a unique action for the purpose of detecting duplicates;
 * e.g. ADD_USER:bob
 */
export const actionFingerprint = <A extends Action>(link: ActionLink<A>) => {
  const fingerprintPayload = (action: A) => {
    switch (action.type) {
      default:
        // ignore coverage
        return JSON.stringify(action.payload)
    }
  }

  if (isRootLink(link)) return 'ROOT'
  return `${link.body.type}:${fingerprintPayload(link.body)}`
}
