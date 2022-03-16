import { append } from '../../chain/append'
import { createChain } from '../../chain/createChain'
import { decryptLink, decryptChain } from '../../chain/decrypt'
import { SignatureChain } from '../../chain/types'
import { TEST_CHAIN_KEYS } from '/test/util/setup'
import { createUser } from '/user'

const chainKeys = TEST_CHAIN_KEYS

describe('decrypt', () => {
  it('decryptLink', () => {
    const alice = createUser('alice')
    let chain = createChain<any>({ user: alice, name: 'test chain', chainKeys })
    chain = append({ chain, action: { type: 'FOO' }, user: alice, chainKeys })

    for (const hash in chain.encryptedLinks) {
      const link = chain.encryptedLinks[hash]
      const decryptedLink = decryptLink(link, chainKeys)
      expect(decryptedLink.body).toEqual(chain.links[hash].body)
      expect(decryptedLink.hash).toEqual(hash)
    }
  })

  it('decryptChain', () => {
    const alice = createUser('alice')
    let chain = createChain<any>({ user: alice, name: 'test chain', chainKeys })
    chain = append({ chain, action: { type: 'FOO' }, user: alice, chainKeys })

    const encryptedChain = {
      root: chain.root,
      head: chain.head,
      encryptedLinks: chain.encryptedLinks,
      links: {}, // don't include unencrypted links
    } as SignatureChain<any, any>

    const decryptedChain = decryptChain(encryptedChain, chainKeys)
    for (const hash in chain.links) {
      const decrypted = decryptedChain.links[hash]
      const original = chain.links[hash]
      expect(decrypted.body).toEqual(original.body)
      expect(decrypted.hash).toEqual(original.hash)
    }
  })
})
