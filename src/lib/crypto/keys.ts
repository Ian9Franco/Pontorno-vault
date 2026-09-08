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
import { assertNewMasterPassword } from '../security/master-password';

export function cryptoContext(purpose: string, ...ids: string[]) {
  if (ids.some(id => !id)) throw new Error('Falta el contexto de cifrado.');
  return new TextEncoder().encode(JSON.stringify(['pontorno-vault', purpose, ...ids]));
}

export async function generateSymmetricKey(
  usages: KeyUsage[] = ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey'],
  extractable = true,
): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    extractable,
    usages,
  );
}

/** Convert a temporary extractable key into the non-extractable runtime form. */
export async function hardenSymmetricKey(
  key: CryptoKey,
  usages: KeyUsage[],
): Promise<CryptoKey> {
  if (!key.extractable) return key;
  const raw = await crypto.subtle.exportKey('raw', key);
  try {
    return await crypto.subtle.importKey(
      'raw',
      raw,
      { name: 'AES-GCM', length: 256 },
      false,
      usages,
    );
  } finally {
    // Best-effort cleanup of the transient exported buffer.
    new Uint8Array(raw).fill(0);
  }
}

export async function wrapKeyAES(
  targetKey: CryptoKey,
  wrappingKey: CryptoKey,
  customNonce?: Uint8Array,
  additionalData?: Uint8Array,
): Promise<EncryptedData> {
  const nonce = customNonce || generateNonce(12);
  const wrappedBuffer = await crypto.subtle.wrapKey(
    'raw',
    targetKey,
    wrappingKey,
    { name: 'AES-GCM', iv: nonce as unknown as BufferSource, tagLength: 128, additionalData: additionalData as BufferSource | undefined },
  );

  return {
    ciphertext: bufferToBase64(wrappedBuffer),
    nonce: bufferToBase64(nonce),
    cryptoVersion: additionalData ? 2 : CURRENT_CRYPTO_VERSION,
  };
}

export async function unwrapKeyAES(
  ciphertextBase64: string,
  nonceBase64: string,
  wrappingKey: CryptoKey,
  keyUsages: KeyUsage[] = ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey'],
  extractable = false,
  additionalData?: Uint8Array,
): Promise<CryptoKey> {
  const wrappedBytes = base64ToBuffer(ciphertextBase64);
  const nonceBytes = base64ToBuffer(nonceBase64);

  return await crypto.subtle.unwrapKey(
    'raw',
    wrappedBytes as unknown as BufferSource,
    wrappingKey,
    { name: 'AES-GCM', iv: nonceBytes as unknown as BufferSource, tagLength: 128, additionalData: additionalData as BufferSource | undefined },
    { name: 'AES-GCM', length: 256 },
    extractable,
    keyUsages,
  );
}

export async function setupUserCrypto(
  masterPassword: string,
  params: ArgonParameters = DEFAULT_ARGON_PARAMS,
  userId?: string,
): Promise<{ setup: UserCryptoSetup; userMasterKey: CryptoKey }> {
  assertNewMasterPassword(masterPassword);
  const salt = generateSalt(16);
  const kek = await deriveKEK(masterPassword, salt, params);
  const temporaryUserMasterKey = await generateSymmetricKey();
  const wrappedKey = await wrapKeyAES(temporaryUserMasterKey, kek, undefined, userId ? cryptoContext('user-key:v2', userId) : undefined);
  const userMasterKey = await hardenSymmetricKey(
    temporaryUserMasterKey,
    ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey'],
  );

  const setup: UserCryptoSetup = {
    kdfSalt: bufferToBase64(salt),
    kdfAlgorithm: 'Argon2id',
    kdfParameters: params,
    encryptedUserKey: wrappedKey.ciphertext,
    userKeyNonce: wrappedKey.nonce,
    cryptoVersion: wrappedKey.cryptoVersion,
  };

  return { setup, userMasterKey };
}

export async function unlockUserMasterKey(
  masterPassword: string,
  cryptoRecord: UserCryptoSetup,
  extractable = false,
  userId?: string,
): Promise<CryptoKey> {
  if (cryptoRecord.kdfAlgorithm !== 'Argon2id' || ![1, 2].includes(cryptoRecord.cryptoVersion)) throw new Error('La versión criptográfica no es compatible.');
  const aad = cryptoRecord.cryptoVersion === 2 ? cryptoContext('user-key:v2', userId || '') : undefined;
  const kek = await deriveKEK(
    masterPassword,
    cryptoRecord.kdfSalt,
    cryptoRecord.kdfParameters,
  );

  return await unwrapKeyAES(
    cryptoRecord.encryptedUserKey,
    cryptoRecord.userKeyNonce,
    kek,
    ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey'],
    extractable,
    aad,
  );
}
