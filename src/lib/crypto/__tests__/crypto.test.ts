import { describe, it, expect } from 'vitest';
import {
  setupUserCrypto,
  unlockUserMasterKey,
  createVaultKey,
  wrapVaultKeyForUser,
  unwrapVaultKey,
  encryptCredential,
  decryptCredential,
  rotateMasterPassword,
  deriveKEKBytes,
  encryptAES_GCM,
  decryptAES_GCM_ToString,
  generateNonce,
  generateSalt,
} from '../index';
import { CredentialPayload } from '../types';

describe('Family Vault — Zero-Knowledge Cryptographic Core', () => {
  // Fast test parameters for Argon2id during unit tests
  const TEST_ARGON_PARAMS = {
    timeCost: 2,
    memoryCost: 4096, // 4MB for fast test execution
    parallelism: 2,
    hashLength: 32,
  };

  describe('Argon2id Key Derivation (KEK)', () => {
    it('should derive deterministic keys given identical password and salt', async () => {
      const password = 'SuperSecretMasterPassword123!';
      const salt = generateSalt(16);

      const kek1 = await deriveKEKBytes(password, salt, TEST_ARGON_PARAMS);
      const kek2 = await deriveKEKBytes(password, salt, TEST_ARGON_PARAMS);

      expect(kek1).toEqual(kek2);
      expect(kek1.length).toBe(32); // 256 bits
    });

    it('should produce completely different keys if salt or password differs', async () => {
      const password = 'SuperSecretMasterPassword123!';
      const salt1 = generateSalt(16);
      const salt2 = generateSalt(16);

      const kek1 = await deriveKEKBytes(password, salt1, TEST_ARGON_PARAMS);
      const kek2 = await deriveKEKBytes(password, salt2, TEST_ARGON_PARAMS);
      const kek3 = await deriveKEKBytes('DifferentPassword!', salt1, TEST_ARGON_PARAMS);

      expect(kek1).not.toEqual(kek2);
      expect(kek1).not.toEqual(kek3);
    });
  });

  describe('AES-256-GCM Primitives & Tamper Resistance', () => {
    it('should encrypt and decrypt plaintext strings accurately', async () => {
      const { userMasterKey } = await setupUserCrypto('Password123!', TEST_ARGON_PARAMS);
      const plaintext = 'Zero-Knowledge credentials test payload';

      const encrypted = await encryptAES_GCM(plaintext, userMasterKey);
      expect(encrypted.ciphertext).toBeDefined();
      expect(encrypted.nonce).toBeDefined();

      const decrypted = await decryptAES_GCM_ToString(encrypted, userMasterKey);
      expect(decrypted).toBe(plaintext);
    });

    it('should reject tampered ciphertexts and invalid auth tags', async () => {
      const { userMasterKey } = await setupUserCrypto('Password123!', TEST_ARGON_PARAMS);
      const plaintext = 'Sensitive bank credentials';

      const encrypted = await encryptAES_GCM(plaintext, userMasterKey);

      // Corrupt a byte in the base64 ciphertext
      const corruptedCiphertext =
        encrypted.ciphertext.substring(0, encrypted.ciphertext.length - 4) + 'AAAA';

      const corruptedEncrypted = {
        ...encrypted,
        ciphertext: corruptedCiphertext,
      };

      await expect(
        decryptAES_GCM_ToString(corruptedEncrypted, userMasterKey)
      ).rejects.toThrow();
    });
  });

  describe('User Account Setup & Master Password Unlock Flow', () => {
    it('should correctly set up a user and unlock with the valid master password', async () => {
      const masterPassword = 'MySecretFamilyPassword2026!';
      const { setup, userMasterKey: originalKey } = await setupUserCrypto(
        masterPassword,
        TEST_ARGON_PARAMS
      );

      expect(setup.kdfSalt).toBeDefined();
      expect(setup.encryptedUserKey).toBeDefined();
      expect(setup.userKeyNonce).toBeDefined();

      // Unlock using valid password
      const unlockedKey = await unlockUserMasterKey(masterPassword, setup);
      expect(unlockedKey).toBeDefined();

      // Test that the unlocked key can decrypt what the original key encrypted
      const testSecret = 'Personal Vault Note';
      const encryptedSecret = await encryptAES_GCM(testSecret, originalKey);
      const decryptedSecret = await decryptAES_GCM_ToString(encryptedSecret, unlockedKey);
      expect(decryptedSecret).toBe(testSecret);
    });

    it('should fail to unlock when an incorrect master password is supplied', async () => {
      const masterPassword = 'CorrectMasterPassword!';
      const wrongPassword = 'WrongMasterPassword!';

      const { setup } = await setupUserCrypto(masterPassword, TEST_ARGON_PARAMS);

      await expect(unlockUserMasterKey(wrongPassword, setup)).rejects.toThrow();
    });
  });

  describe('Multi-User Envelope Encryption (Shared Family Vault)', () => {
    it('should allow multiple family members with different master passwords to access the same shared vault', async () => {
      // 1. Setup User 1 (Ian)
      const ianPassword = 'IanMasterPassword2026!';
      const { setup: ianSetup } = await setupUserCrypto(ianPassword, TEST_ARGON_PARAMS);
      const ianUserMasterKey = await unlockUserMasterKey(ianPassword, ianSetup);

      // 2. Setup User 2 (Father)
      const fatherPassword = 'FatherDifferentPassword2026!';
      const { setup: fatherSetup } = await setupUserCrypto(fatherPassword, TEST_ARGON_PARAMS);
      const fatherUserMasterKey = await unlockUserMasterKey(fatherPassword, fatherSetup);

      // 3. Create a Shared Family Vault Key
      const familyVaultKey = await createVaultKey();

      // 4. Wrap the Family Vault Key for Ian
      const ianWrappedVaultKey = await wrapVaultKeyForUser(familyVaultKey, ianUserMasterKey);

      // 5. Wrap the same Family Vault Key for Father
      const fatherWrappedVaultKey = await wrapVaultKeyForUser(familyVaultKey, fatherUserMasterKey);

      // 6. Ian creates and encrypts a shared credential (e.g. Netflix)
      const netflixCredential: CredentialPayload = {
        platform: 'Netflix',
        username: 'family@example.com',
        password: 'UltraSecureNetflixPassword4K!',
        url: 'https://www.netflix.com',
        notes: 'Family Premium 4K Plan - do not change email',
      };

      // Ian unwraps his vault key and encrypts the credential
      const ianUnwrappedVaultKey = await unwrapVaultKey(
        ianWrappedVaultKey.ciphertext,
        ianWrappedVaultKey.nonce,
        ianUserMasterKey
      );
      const encryptedNetflix = await encryptCredential(netflixCredential, ianUnwrappedVaultKey);

      // 7. Father logs in, unlocks his account, unwraps the shared vault key, and decrypts the credential!
      const fatherRecoveredUserKey = await unlockUserMasterKey(fatherPassword, fatherSetup);
      const fatherUnwrappedVaultKey = await unwrapVaultKey(
        fatherWrappedVaultKey.ciphertext,
        fatherWrappedVaultKey.nonce,
        fatherRecoveredUserKey
      );

      const decryptedByFather = await decryptCredential(encryptedNetflix, fatherUnwrappedVaultKey);

      expect(decryptedByFather).toEqual(netflixCredential);
      expect(decryptedByFather.platform).toBe('Netflix');
      expect(decryptedByFather.password).toBe('UltraSecureNetflixPassword4K!');
    });
  });

  describe('Master Password Rotation (Zero-Knowledge Key Re-wrapping)', () => {
    it('should rotate master password without altering stored credentials or vault keys', async () => {
      const oldPassword = 'OldMasterPassword1!';
      const newPassword = 'NewMasterPassword2!';

      // 1. Initial user setup and vault setup
      const { setup: initialSetup } = await setupUserCrypto(oldPassword, TEST_ARGON_PARAMS);
      const userMasterKey = await unlockUserMasterKey(oldPassword, initialSetup);

      const personalVaultKey = await createVaultKey();
      const wrappedVaultKey = await wrapVaultKeyForUser(personalVaultKey, userMasterKey);

      // 2. Encrypt a credential in the vault
      const bankCredential: CredentialPayload = {
        platform: 'Home Banking',
        username: 'ian_banking',
        password: 'BankPassword999!',
        url: 'https://bank.example.com',
        notes: 'Critical financial credential',
      };

      const encryptedCredential = await encryptCredential(bankCredential, personalVaultKey);

      // 3. User rotates master password
      const { updatedSetup } = await rotateMasterPassword(
        oldPassword,
        newPassword,
        initialSetup,
        TEST_ARGON_PARAMS
      );

      // 4. Verify old password fails to unlock the updated setup
      await expect(unlockUserMasterKey(oldPassword, updatedSetup)).rejects.toThrow();

      // 5. Verify new password successfully unlocks and recovers the original UserMasterKey
      const newUnlockedUserKey = await unlockUserMasterKey(newPassword, updatedSetup);
      expect(newUnlockedUserKey).toBeDefined();

      // 6. Verify we can still unwrap the VaultKey with the recovered UserMasterKey
      const recoveredVaultKey = await unwrapVaultKey(
        wrappedVaultKey.ciphertext,
        wrappedVaultKey.nonce,
        newUnlockedUserKey
      );

      // 7. Verify the untouched encrypted credential is still decrypted perfectly!
      const decryptedCredential = await decryptCredential(encryptedCredential, recoveredVaultKey);
      expect(decryptedCredential).toEqual(bankCredential);
      expect(decryptedCredential.password).toBe('BankPassword999!');
    });
  });
});
