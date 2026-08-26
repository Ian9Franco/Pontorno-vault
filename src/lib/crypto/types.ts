/**
 * Cryptographic type definitions for Family Vault (Zero-Knowledge Architecture).
 */

export interface ArgonParameters {
  timeCost: number; // Iterations (e.g. 3)
  memoryCost: number; // Memory in KB (e.g. 65536 = 64MB)
  parallelism: number; // Threads (e.g. 4)
  hashLength: number; // Output length in bytes (32 for 256-bit key)
}

export interface EncryptedData {
  ciphertext: string; // Base64 encoded ciphertext + auth tag
  nonce: string; // Base64 encoded 12-byte IV
  cryptoVersion: number;
}

export interface UserCryptoSetup {
  kdfSalt: string; // Base64 salt (16 bytes)
  kdfAlgorithm: string; // "Argon2id"
  kdfParameters: ArgonParameters;
  encryptedUserKey: string; // Base64 encrypted 256-bit UserMasterKey
  userKeyNonce: string; // Base64 12-byte IV for the UserMasterKey
  cryptoVersion: number;
}

export interface UnlockedUserSession {
  userMasterKey: CryptoKey;
  kek: CryptoKey;
}

export interface CredentialPayload {
  platform: string;
  username: string;
  password: string;
  url?: string;
  notes?: string;
  customFields?: Array<{ key: string; value: string }>;
}

export interface WrappedVaultKey {
  vaultId: string;
  userId: string;
  encryptedVaultKey: string; // Base64 encrypted with recipient's UserMasterKey
  nonce: string; // Base64 12-byte IV
  permissions: 'READ' | 'WRITE' | 'ADMIN';
}
