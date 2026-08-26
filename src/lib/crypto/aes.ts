import { EncryptedData } from './types';
import {
  base64ToBuffer,
  bufferToBase64,
  bufferToString,
  stringToBuffer,
} from './serialization';

export const CURRENT_CRYPTO_VERSION = 1;

/**
 * Generates a 96-bit (12 bytes) cryptographically secure nonce / IV for AES-GCM.
 * Nonces must NEVER be reused with the same key.
 */
export function generateNonce(byteLength = 12): Uint8Array {
  const nonce = new Uint8Array(byteLength);
  crypto.getRandomValues(nonce);
  return nonce;
}

/**
 * Encrypts data (string or Uint8Array) using AES-256-GCM authenticated encryption.
 * Returns Base64 ciphertext (with authentication tag) and Base64 nonce.
 */
export async function encryptAES_GCM(
  data: string | Uint8Array,
  key: CryptoKey,
  customNonce?: Uint8Array
): Promise<EncryptedData> {
  const plaintext = typeof data === 'string' ? stringToBuffer(data) : data;
  const nonce = customNonce || generateNonce(12);

  const ciphertextBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: nonce as unknown as BufferSource,
      tagLength: 128, // 16-byte authentication tag
    },
    key,
    plaintext as unknown as BufferSource
  );

  return {
    ciphertext: bufferToBase64(ciphertextBuffer),
    nonce: bufferToBase64(nonce),
    cryptoVersion: CURRENT_CRYPTO_VERSION,
  };
}

/**
 * Decrypts an EncryptedData record using AES-256-GCM.
 * Throws an error if decryption fails (e.g. invalid key, corrupted ciphertext, or tampered auth tag).
 */
export async function decryptAES_GCM(
  encryptedData: EncryptedData,
  key: CryptoKey
): Promise<Uint8Array> {
  const ciphertextBytes = base64ToBuffer(encryptedData.ciphertext);
  const nonceBytes = base64ToBuffer(encryptedData.nonce);

  const decryptedBuffer = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: nonceBytes as unknown as BufferSource,
      tagLength: 128,
    },
    key,
    ciphertextBytes as unknown as BufferSource
  );

  return new Uint8Array(decryptedBuffer);
}

/**
 * Decrypts an EncryptedData record and decodes it as a UTF-8 string.
 */
export async function decryptAES_GCM_ToString(
  encryptedData: EncryptedData,
  key: CryptoKey
): Promise<string> {
  const decryptedBytes = await decryptAES_GCM(encryptedData, key);
  return bufferToString(decryptedBytes);
}
