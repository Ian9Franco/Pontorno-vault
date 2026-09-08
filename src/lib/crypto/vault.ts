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
  cryptoContext,
} from './keys';
import { assertNewMasterPassword } from '../security/master-password';
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
  context?: { vaultId: string; userId: string },
): Promise<EncryptedData> {
  return await wrapKeyAES(vaultKey, recipientUserMasterKey, undefined, context ? cryptoContext('vault-key:v2', context.vaultId, context.userId) : undefined);
}

export async function unwrapVaultKey(
  encryptedVaultKey: string,
  nonce: string,
  userMasterKey: CryptoKey,
  context?: { vaultId: string; userId: string; cryptoVersion: number },
): Promise<CryptoKey> {
  if (context && ![1, 2].includes(context.cryptoVersion)) throw new Error('La versión de clave no es compatible.');
  return await unwrapKeyAES(encryptedVaultKey, nonce, userMasterKey, ['encrypt', 'decrypt'], false,
    context?.cryptoVersion === 2 ? cryptoContext('vault-key:v2', context.vaultId, context.userId) : undefined);
}

export async function encryptCredential(
  payload: CredentialPayload,
  vaultKey: CryptoKey,
  context?: { vaultId: string; credentialId: string },
): Promise<EncryptedData> {
  const jsonString = JSON.stringify(payload);
  return await encryptAES_GCM(
    jsonString,
    vaultKey,
    undefined,
    context ? cryptoContext('credential:v3', context.vaultId, context.credentialId) : CREDENTIAL_AAD,
    context ? 3 : CURRENT_CREDENTIAL_CRYPTO_VERSION,
  );
}

export async function decryptCredential(
  encryptedData: EncryptedData,
  vaultKey: CryptoKey,
  context?: { vaultId: string; credentialId: string },
): Promise<CredentialPayload> {
  // v1 records predate AAD and remain readable. New v2 records are domain-separated
  // so credential ciphertext cannot be silently reinterpreted as another protocol object.
  if (![1, 2, 3].includes(encryptedData.cryptoVersion)) throw new Error('La versión de credencial no es compatible.');
  const aad = encryptedData.cryptoVersion === 3 ? cryptoContext('credential:v3', context?.vaultId || '', context?.credentialId || '') :
    encryptedData.cryptoVersion === 2 ? CREDENTIAL_AAD : undefined;
  const jsonString = await decryptAES_GCM_ToString(encryptedData, vaultKey, aad);
  return JSON.parse(jsonString) as CredentialPayload;
}

export async function rotateMasterPassword(
  oldPassword: string,
  newPassword: string,
  currentCryptoRecord: UserCryptoSetup,
  newParams: ArgonParameters = DEFAULT_ARGON_PARAMS,
  userId?: string,
): Promise<{ updatedSetup: UserCryptoSetup; userMasterKey: CryptoKey }> {
  assertNewMasterPassword(newPassword);
  // Rotation briefly needs an extractable UMK solely so WebCrypto can wrap it.
  const temporaryUserMasterKey = await unlockUserMasterKey(oldPassword, currentCryptoRecord, true, userId);
  const newSalt = generateSalt(16);
  const newKEK = await deriveKEK(newPassword, newSalt, newParams);
  const wrappedKey = await wrapKeyAES(temporaryUserMasterKey, newKEK, undefined, userId ? cryptoContext('user-key:v2', userId) : undefined);
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
    cryptoVersion: wrappedKey.cryptoVersion,
  };

  return { updatedSetup, userMasterKey };
}
