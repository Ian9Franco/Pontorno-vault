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
  hardenSymmetricKey,
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

export const CURRENT_CREDENTIAL_CRYPTO_VERSION = 2;
const CREDENTIAL_AAD = new TextEncoder().encode('pontorno-vault:credential:v2');

export async function createVaultKey(): Promise<CryptoKey> {
  // Temporarily extractable because it must be wrapped for the member before
  // persistence. Callers should harden the runtime copy immediately after wrap.
  return await generateSymmetricKey(['encrypt', 'decrypt', 'wrapKey', 'unwrapKey'], true);
}

export async function wrapVaultKeyForUser(
  vaultKey: CryptoKey,
  recipientUserMasterKey: CryptoKey,
): Promise<EncryptedData> {
  return await wrapKeyAES(vaultKey, recipientUserMasterKey);
}

export async function unwrapVaultKey(
  encryptedVaultKey: string,
  nonce: string,
  userMasterKey: CryptoKey,
): Promise<CryptoKey> {
  return await unwrapKeyAES(encryptedVaultKey, nonce, userMasterKey, ['encrypt', 'decrypt'], false);
}

export async function encryptCredential(
  payload: CredentialPayload,
  vaultKey: CryptoKey,
): Promise<EncryptedData> {
  const jsonString = JSON.stringify(payload);
  return await encryptAES_GCM(
    jsonString,
    vaultKey,
    undefined,
    CREDENTIAL_AAD,
    CURRENT_CREDENTIAL_CRYPTO_VERSION,
  );
}

export async function decryptCredential(
  encryptedData: EncryptedData,
  vaultKey: CryptoKey,
): Promise<CredentialPayload> {
  // v1 records predate AAD and remain readable. New v2 records are domain-separated
  // so credential ciphertext cannot be silently reinterpreted as another protocol object.
  const aad = encryptedData.cryptoVersion >= CURRENT_CREDENTIAL_CRYPTO_VERSION ? CREDENTIAL_AAD : undefined;
  const jsonString = await decryptAES_GCM_ToString(encryptedData, vaultKey, aad);
  return JSON.parse(jsonString) as CredentialPayload;
}

export async function rotateMasterPassword(
  oldPassword: string,
  newPassword: string,
  currentCryptoRecord: UserCryptoSetup,
  newParams: ArgonParameters = DEFAULT_ARGON_PARAMS,
): Promise<{ updatedSetup: UserCryptoSetup; userMasterKey: CryptoKey }> {
  // Rotation briefly needs an extractable UMK solely so WebCrypto can wrap it.
  const temporaryUserMasterKey = await unlockUserMasterKey(oldPassword, currentCryptoRecord, true);
  const newSalt = generateSalt(16);
  const newKEK = await deriveKEK(newPassword, newSalt, newParams);
  const wrappedKey = await wrapKeyAES(temporaryUserMasterKey, newKEK);
  const userMasterKey = await hardenSymmetricKey(
    temporaryUserMasterKey,
    ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey'],
  );

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
