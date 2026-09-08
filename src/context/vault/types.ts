import type { User } from '@supabase/supabase-js';
import type { CredentialPayload, UserCryptoSetup } from '@/lib/crypto';
import type { OtpAlias, OtpSnapshot } from '@/lib/otp/types';
/** Public models and encrypted local storage schema. */
export interface CreatorInfo {
  id: string;
  name: string;
  email?: string;
  isCurrentUser: boolean;
}

export interface VaultItem {
  id: string;
  vaultId: string;
  payload: CredentialPayload;
  updatedAt: string;
  createdAt?: string;
  createdBy?: CreatorInfo;
}

export interface VaultEntity {
  id: string;
  name: string;
  type: 'PERSONAL' | 'SHARED';
  permissions: 'READ' | 'WRITE' | 'ADMIN';
  isOwner: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
}

export interface UnifiedAuthParams {
  email: string;
  masterPassword: string;
  displayName?: string;
  isSignUp: boolean;
}

export interface VaultContextType {
  loadOtpInbox: (vaultId: string) => Promise<OtpSnapshot>;
  configureOtp: (credentialId: string, serviceKey: string) => Promise<OtpAlias>;
  setOtpAliasStatus: (vaultId: string, aliasId: string, status: 'active' | 'paused') => Promise<void>;
  dismissOtp: (vaultId: string, id: string) => Promise<void>;
  listOtpMembers: (vaultId: string) => Promise<Array<{user_id:string;can_read:boolean}>>;
  setOtpAccess: (vaultId: string,userId: string,allow: boolean) => Promise<void>;
  user: User | null;
  userProfile: UserProfile | null;
  isUnlocked: boolean;
  isConfigured: boolean;
  isSupabaseConnected: boolean;
  activeVaultId: string | null;
  vaults: VaultEntity[];
  credentials: VaultItem[];
  isLoading: boolean;
  accessError: string | null;
  autoLockMinutes: number;
  timeRemainingSeconds: number;
  setActiveVaultId: (id: string) => void;
  setAutoLockMinutes: (minutes: number) => void;
  unifiedAuth: (params: UnifiedAuthParams) => Promise<void>;
  signOut: () => Promise<void>;
  unlock: (masterPassword: string) => Promise<void>;
  lock: () => void;
  saveCredential: (payload: CredentialPayload, credentialId?: string, targetVaultId?: string) => Promise<void>;
  removeCredential: (credentialId: string) => Promise<void>;
  createVault: (name: string, type: 'PERSONAL' | 'SHARED') => Promise<void>;
  updateVault: (vaultId: string, name: string, type: 'PERSONAL' | 'SHARED') => Promise<void>;
  removeVault: (vaultId: string) => Promise<void>;
  changeMasterPassword: (oldPass: string, newPass: string) => Promise<void>;
  updateDisplayName: (newName: string) => Promise<void>;
}

export const DEMO_STORAGE_KEY = 'family_vault_encrypted_store_v1';

export interface StoredEncryptedDB {
  userCrypto: UserCryptoSetup | null;
  profile?: { id: string; email: string; displayName: string };
  vaults: Array<{ id: string; name: string; type: 'PERSONAL' | 'SHARED' }>;
  vaultMembers: Array<{ vaultId: string; userId: string; encryptedVaultKey: string; nonce: string; cryptoVersion?: number; permissions: 'READ' | 'WRITE' | 'ADMIN' }>;
  credentials: Array<{
    id: string;
    vaultId: string;
    encryptedPayload: string;
    nonce: string;
    cryptoVersion: number;
    createdBy?: { id: string; name: string; email?: string };
    updatedAt: string;
    createdAt?: string;
  }>;
}
