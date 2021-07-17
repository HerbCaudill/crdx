import { asymmetric, signatures, symmetric } from '@herbcaudill/crypto'
import { createUser } from '@/user/createUser'
import '@/test/util/expect/toLookLikeKeyset'

describe('user', () => {
  it('creates a new user', () => {
    const bob = createUser('bob')
    expect(bob.userName).toBe('bob')
    expect(bob).toHaveProperty('keys')
  })

  describe('working keys', () => {
    const message = 'the crocodile lunges at dawn'

    it('provides a working keypair for signatures', () => {
      const keypair = createUser('bob').keys.signature
      const { secretKey, publicKey } = keypair
      const signature = signatures.sign(message, secretKey)
      const signedMessage = { payload: message, signature, publicKey }
      expect(signatures.verify(signedMessage)).toBe(true)
    })

    it('provides a working keyset for asymmetric encryption', () => {
      const charlie = createUser('charlie').keys.encryption
      const bob = asymmetric.keyPair()

      // Charlie encrypts a message for Bob
      const cipher = asymmetric.encrypt({
        secret: message,
        recipientPublicKey: bob.publicKey,
        senderSecretKey: charlie.secretKey,
      })

      // Bob decrypts the message
      const decrypted = asymmetric.decrypt({
        cipher: cipher,
        senderPublicKey: charlie.publicKey,
        recipientSecretKey: bob.secretKey,
      })
      expect(decrypted).toEqual(message)
    })

    it('provides a working keyset for symmetric encryption', () => {
      const { secretKey } = createUser('bob').keys
      const cipher = symmetric.encrypt(message, secretKey)
      const decrypted = symmetric.decrypt(cipher, secretKey)
      expect(decrypted).toEqual(message)
    })
  })
})
