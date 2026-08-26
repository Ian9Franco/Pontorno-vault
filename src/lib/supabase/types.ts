export type FamilyRole = 'OWNER' | 'ADMIN' | 'MEMBER';
export type VaultType = 'PERSONAL' | 'SHARED';
export type VaultPermission = 'READ' | 'WRITE' | 'ADMIN';

export interface ProfileRow {
  id: string;
  display_name: string;
  avatar_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserCryptoRow {
  user_id: string;
  encrypted_user_key: string;
  user_key_nonce: string;
  kdf_salt: string;
  kdf_algorithm: string;
  kdf_parameters: {
    timeCost: number;
    memoryCost: number;
    parallelism: number;
    hashLength: number;
  };
  crypto_version: number;
  created_at: string;
  updated_at: string;
}

export interface FamilyRow {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface FamilyMemberRow {
  id: string;
  family_id: string;
  user_id: string;
  role: FamilyRole;
  joined_at: string;
}

export interface VaultRow {
  id: string;
  family_id?: string | null;
  owner_user_id: string;
  name: string;
  type: VaultType;
  created_at: string;
  updated_at: string;
}

export interface VaultMemberRow {
  id: string;
  vault_id: string;
  user_id: string;
  encrypted_vault_key: string;
  nonce: string;
  permissions: VaultPermission;
  created_at: string;
  updated_at: string;
}

export interface CredentialRow {
  id: string;
  vault_id: string;
  encrypted_payload: string;
  nonce: string;
  crypto_version: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}
