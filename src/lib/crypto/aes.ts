import { EncryptedData } from './types';
import {
  base64ToBuffer,
  bufferToBase64,
  bufferToString,
  stringToBuffer,
} from './serialization';

export const CURRENT_CRYPTO_VERSION = 1;

export function generateNonce(byteLength = 12): Uint8Array {
  const nonce = new Uint8Array(byteLength);
  crypto.getRandomValues(nonce);
  return nonce;
}

export async function encryptAES_GCM(
  data: string | Uint8Array,
  key: CryptoKey,
  customNonce?: Uint8Array,
  additionalData?: Uint8Array,
  cryptoVersion = CURRENT_CRYPTO_VERSION,
): Promise<EncryptedData> {
  const plaintext = typeof data === 'string' ? stringToBuffer(data) : data;
  const nonce = customNonce || generateNonce(12);
  const algorithm: AesGcmParams = {
    name: 'AES-GCM',
    iv: nonce as unknown as BufferSource,
    tagLength: 128,
    ...(additionalData ? { additionalData: additionalData as unknown as BufferSource } : {}),
  };

  const ciphertextBuffer = await crypto.subtle.encrypt(
    algorithm,
    key,
    plaintext as unknown as BufferSource,
  );

  return {
    ciphertext: bufferToBase64(ciphertextBuffer),
    nonce: bufferToBase64(nonce),
    cryptoVersion,
  };
}

export async function decryptAES_GCM(
  encryptedData: EncryptedData,
  key: CryptoKey,
  additionalData?: Uint8Array,
): Promise<Uint8Array> {
  const ciphertextBytes = base64ToBuffer(encryptedData.ciphertext);
  const nonceBytes = base64ToBuffer(encryptedData.nonce);
  const algorithm: AesGcmParams = {
    name: 'AES-GCM',
    iv: nonceBytes as unknown as BufferSource,
    tagLength: 128,
    ...(additionalData ? { additionalData: additionalData as unknown as BufferSource } : {}),
  };

  const decryptedBuffer = await crypto.subtle.decrypt(
    algorithm,
    key,
    ciphertextBytes as unknown as BufferSource,
  );

  return new Uint8Array(decryptedBuffer);
}

export async function decryptAES_GCM_ToString(
  encryptedData: EncryptedData,
  key: CryptoKey,
  additionalData?: Uint8Array,
): Promise<string> {
  const decryptedBytes = await decryptAES_GCM(encryptedData, key, additionalData);
  return bufferToString(decryptedBytes);
}
