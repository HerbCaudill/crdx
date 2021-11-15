import { initCrypto } from '@herbcaudill/crypto'
import { createUser } from '/user/createUser'
import '/test/util/expect/toLookLikeKeyset'

describe('user', () => {
  it('creates a new user', async () => {
    const bob = await createUser('bob')
    expect(bob.userName).toBe('bob')
    expect(bob).toHaveProperty('keys')
  })

  describe('working keys', () => {
    const message = 'the crocodile lunges at dawn'

    it('provides a working keypair for signatures', async () => {
      const { signatures } = await initCrypto()
      const bob = await createUser('bob')
      const keypair = bob.keys.signature
      const { secretKey, publicKey } = keypair
      const signature = signatures.sign(message, secretKey)
      const signedMessage = { payload: message, signature, publicKey }
      expect(signatures.verify(signedMessage)).toBe(true)
    })

    it('provides a working keyset for asymmetric encryption', async () => {
      const { asymmetric } = await initCrypto()

      const charlie = await createUser('charlie')
      const charlieKeys = charlie.keys.encryption
      const bobKeys = asymmetric.keyPair()

      // Charlie encrypts a message for Bob
      const cipher = asymmetric.encrypt({
        secret: message,
        recipientPublicKey: bobKeys.publicKey,
        senderSecretKey: charlieKeys.secretKey,
      })

      // Bob decrypts the message
      const decrypted = asymmetric.decrypt({
        cipher: cipher,
        senderPublicKey: charlieKeys.publicKey,
        recipientSecretKey: bobKeys.secretKey,
      })
      expect(decrypted).toEqual(message)
    })

    it('provides a working keyset for symmetric encryption', async () => {
      const { symmetric } = await initCrypto()
      const bob = await createUser('bob')
      const { secretKey } = bob.keys
      const cipher = symmetric.encrypt(message, secretKey)
      const decrypted = symmetric.decrypt(cipher, secretKey)
      expect(decrypted).toEqual(message)
    })
  })
})
