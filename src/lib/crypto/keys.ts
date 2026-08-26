import {
  ArgonParameters,
  EncryptedData,
  UserCryptoSetup,
} from './types';
import {
  DEFAULT_ARGON_PARAMS,
  deriveKEK,
  generateSalt,
} from './argon';
import {
  CURRENT_CRYPTO_VERSION,
  generateNonce,
} from './aes';
import {
  base64ToBuffer,
  bufferToBase64,
} from './serialization';

/**
 * Generates a high-entropy 256-bit symmetric AES-GCM key.
 * Can be used as a UserMasterKey or a VaultKey.
 */
export async function generateSymmetricKey(
  usages: KeyUsage[] = ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey'],
  extractable = true
): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    extractable,
    usages
  );
}

/**
 * Wraps (encrypts) a target CryptoKey using a wrapping CryptoKey (e.g. KEK wrapping UserMasterKey,
 * or UserMasterKey wrapping VaultKey).
 */
export async function wrapKeyAES(
  targetKey: CryptoKey,
  wrappingKey: CryptoKey,
  customNonce?: Uint8Array
): Promise<EncryptedData> {
  const nonce = customNonce || generateNonce(12);

  const wrappedBuffer = await crypto.subtle.wrapKey(
    'raw',
    targetKey,
    wrappingKey,
    {
      name: 'AES-GCM',
      iv: nonce as unknown as BufferSource,
      tagLength: 128,
    }
  );

  return {
    ciphertext: bufferToBase64(wrappedBuffer),
    nonce: bufferToBase64(nonce),
    cryptoVersion: CURRENT_CRYPTO_VERSION,
  };
}

/**
 * Unwraps (decrypts) an encrypted CryptoKey using a wrapping CryptoKey.
 */
export async function unwrapKeyAES(
  ciphertextBase64: string,
  nonceBase64: string,
  wrappingKey: CryptoKey,
  keyUsages: KeyUsage[] = ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey'],
  extractable = true
): Promise<CryptoKey> {
  const wrappedBytes = base64ToBuffer(ciphertextBase64);
  const nonceBytes = base64ToBuffer(nonceBase64);

  return await crypto.subtle.unwrapKey(
    'raw',
    wrappedBytes as unknown as BufferSource,
    wrappingKey,
    {
      name: 'AES-GCM',
      iv: nonceBytes as unknown as BufferSource,
      tagLength: 128,
    },
    {
      name: 'AES-GCM',
      length: 256,
    },
    extractable,
    keyUsages
  );
}

/**
 * Sets up a brand new user's cryptographic identity:
 * 1. Generates random salt.
 * 2. Derives KEK with Argon2id.
 * 3. Generates random 256-bit UserMasterKey.
 * 4. Wraps UserMasterKey with KEK.
 * 5. Returns payload ready for Supabase `user_crypto` table + the raw UserMasterKey in memory.
 */
export async function setupUserCrypto(
  masterPassword: string,
  params: ArgonParameters = DEFAULT_ARGON_PARAMS
): Promise<{ setup: UserCryptoSetup; userMasterKey: CryptoKey }> {
  const salt = generateSalt(16);
  const kek = await deriveKEK(masterPassword, salt, params);
  const userMasterKey = await generateSymmetricKey();

  const wrappedKey = await wrapKeyAES(userMasterKey, kek);

  const setup: UserCryptoSetup = {
    kdfSalt: bufferToBase64(salt),
    kdfAlgorithm: 'Argon2id',
    kdfParameters: params,
    encryptedUserKey: wrappedKey.ciphertext,
    userKeyNonce: wrappedKey.nonce,
    cryptoVersion: CURRENT_CRYPTO_VERSION,
  };

  return { setup, userMasterKey };
}

/**
 * Unlocks a user's vault session by:
 * 1. Deriving KEK from provided masterPassword and stored salt/params.
 * 2. Unwrapping the UserMasterKey.
 * Throws an error if masterPassword is wrong or data is corrupted.
 */
export async function unlockUserMasterKey(
  masterPassword: string,
  cryptoRecord: UserCryptoSetup
): Promise<CryptoKey> {
  const kek = await deriveKEK(
    masterPassword,
    cryptoRecord.kdfSalt,
    cryptoRecord.kdfParameters
  );

  return await unwrapKeyAES(
    cryptoRecord.encryptedUserKey,
    cryptoRecord.userKeyNonce,
    kek
  );
}
