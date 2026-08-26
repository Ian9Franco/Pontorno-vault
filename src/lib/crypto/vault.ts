import {
  ArgonParameters,
  CredentialPayload,
  EncryptedData,
  UserCryptoSetup,
} from './types';
import {
  decryptAES_GCM_ToString,
  encryptAES_GCM,
} from './aes';
import {
  generateSymmetricKey,
  setupUserCrypto,
  unlockUserMasterKey,
  unwrapKeyAES,
  wrapKeyAES,
} from './keys';
import {
  DEFAULT_ARGON_PARAMS,
  deriveKEK,
  generateSalt,
} from './argon';
import { bufferToBase64 } from './serialization';

/**
 * Generates a new random 256-bit symmetric key for a Vault (Personal or Shared).
 */
export async function createVaultKey(): Promise<CryptoKey> {
  return await generateSymmetricKey(['encrypt', 'decrypt', 'wrapKey', 'unwrapKey'], true);
}

/**
 * Wraps a VaultKey for a specific user using that user's UserMasterKey.
 * This is used when creating a vault or inviting/sharing a vault with a family member.
 */
export async function wrapVaultKeyForUser(
  vaultKey: CryptoKey,
  recipientUserMasterKey: CryptoKey
): Promise<EncryptedData> {
  return await wrapKeyAES(vaultKey, recipientUserMasterKey);
}

/**
 * Unwraps a VaultKey using the user's UserMasterKey.
 */
export async function unwrapVaultKey(
  encryptedVaultKey: string,
  nonce: string,
  userMasterKey: CryptoKey
): Promise<CryptoKey> {
  return await unwrapKeyAES(encryptedVaultKey, nonce, userMasterKey, ['encrypt', 'decrypt']);
}

/**
 * Encrypts a credential payload (platform, username, password, url, notes) using the VaultKey.
 */
export async function encryptCredential(
  payload: CredentialPayload,
  vaultKey: CryptoKey
): Promise<EncryptedData> {
  const jsonString = JSON.stringify(payload);
  return await encryptAES_GCM(jsonString, vaultKey);
}

/**
 * Decrypts an encrypted credential payload using the VaultKey.
 */
export async function decryptCredential(
  encryptedData: EncryptedData,
  vaultKey: CryptoKey
): Promise<CredentialPayload> {
  const jsonString = await decryptAES_GCM_ToString(encryptedData, vaultKey);
  return JSON.parse(jsonString) as CredentialPayload;
}

/**
 * Rotates a user's Master Password without modifying the UserMasterKey, VaultKeys or any stored credentials!
 * 1. Verifies and unwraps the UserMasterKey with oldPassword.
 * 2. Generates a fresh random salt.
 * 3. Derives new KEK from newPassword.
 * 4. Re-wraps the same UserMasterKey with new KEK.
 */
export async function rotateMasterPassword(
  oldPassword: string,
  newPassword: string,
  currentCryptoRecord: UserCryptoSetup,
  newParams: ArgonParameters = DEFAULT_ARGON_PARAMS
): Promise<{ updatedSetup: UserCryptoSetup; userMasterKey: CryptoKey }> {
  // Step 1: Unlock the existing UserMasterKey
  const userMasterKey = await unlockUserMasterKey(oldPassword, currentCryptoRecord);

  // Step 2: Generate new salt and derive new KEK
  const newSalt = generateSalt(16);
  const newKEK = await deriveKEK(newPassword, newSalt, newParams);

  // Step 3: Wrap the existing UserMasterKey with new KEK
  const wrappedKey = await wrapKeyAES(userMasterKey, newKEK);

  const updatedSetup: UserCryptoSetup = {
    kdfSalt: bufferToBase64(newSalt),
    kdfAlgorithm: 'Argon2id',
    kdfParameters: newParams,
    encryptedUserKey: wrappedKey.ciphertext,
    userKeyNonce: wrappedKey.nonce,
    cryptoVersion: currentCryptoRecord.cryptoVersion,
  };

  return { updatedSetup, userMasterKey };
}
