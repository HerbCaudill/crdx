import { truncateHashes } from './truncateHashes'
import { SyncMessage } from '/sync'
import util from 'util'
import { NetworkMessage } from '/test/util/Network'

export const logMessages = (msgs: NetworkMessage[]) => {
  const result = msgs.map(m => JSON.stringify({ from: m.from, to: m.to, ...syncMessageSummary(m.body) })).join('\n')
  console.log(result)
}

export const syncMessageSummary = (m: SyncMessage<any, any>) => {
  if (m === undefined) {
    return 'DONE'
  } else {
    const { head, linkMap, links, need } = m
    const body = { head } as any
    if (linkMap) body.linkMap = Object.keys(linkMap).join(',')
    if (links) body.links = Object.keys(links).join(',')
    if (need) body.need = need.join(',')

    return truncateHashes(body)
  }
}
