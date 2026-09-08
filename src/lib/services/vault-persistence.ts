import type { SupabaseClient } from '@supabase/supabase-js';
import { createVaultKey, hardenSymmetricKey, unwrapVaultKey, wrapVaultKeyForUser } from '../crypto';
import type { VaultPermission, VaultType } from '../supabase/types';

interface Membership {
  crypto_version?: number;
  encrypted_vault_key: string;
  nonce: string;
  permissions: VaultPermission;
  vaults: { id: string; name: string; type: VaultType; owner_user_id: string } | null;
}

export async function loadOwnedVaults(client: SupabaseClient, userMasterKey: CryptoKey, userId: string, check = () => {}) {
  const { data, error } = await client.from('vault_members')
    .select('vault_id, encrypted_vault_key, nonce, crypto_version, permissions, vaults ( id, name, type, owner_user_id )')
    .eq('user_id', userId);
  if (error) throw error;
  if (!data) throw new Error('No se pudieron cargar las membresías');
  const loaded = [];
  for (const row of data as unknown as Membership[]) {
    if (!row.vaults) throw new Error('Membresía sin bóveda accesible');
    let key: CryptoKey;
    try {
      key = await unwrapVaultKey(row.encrypted_vault_key, row.nonce, userMasterKey,
        { vaultId: row.vaults.id, userId, cryptoVersion: row.crypto_version || 1 });
    } catch {
      throw new Error('No se pudo abrir la clave de una bóveda existente. No se reemplazó ningún dato. Solicita revisar el acceso a esa bóveda.');
    }
    loaded.push({ id: row.vaults.id, name: row.vaults.name, type: row.vaults.type,
      key, permissions: row.permissions, isOwner: row.vaults.owner_user_id === userId });
  }
  if (data.length === 0) {
    check();
    loaded.push(await createOwnedVault(client, userMasterKey, 'Mi Bóveda Personal', 'PERSONAL', userId, check));
  }
  return loaded;
}

export async function createOwnedVault(
  client: SupabaseClient,
  userMasterKey: CryptoKey,
  name: string,
  type: 'PERSONAL' | 'SHARED',
  userId?: string,
  check = () => {},
) {
  const vaultId = crypto.randomUUID();
  const temporaryKey = await createVaultKey();
  const wrapped = await wrapVaultKeyForUser(temporaryKey, userMasterKey, userId ? { vaultId, userId } : undefined);
  const key = await hardenSymmetricKey(temporaryKey, ['encrypt', 'decrypt']);
  check();
  const { data: id, error } = await client.rpc(userId ? 'create_owned_vault_v2' : 'create_owned_vault', {
    p_name: name,
    p_type: type,
    p_encrypted_vault_key: wrapped.ciphertext,
    p_nonce: wrapped.nonce,
    ...(userId ? { p_vault_id: vaultId } : {}),
  });
  if (error) throw error;
  if (typeof id !== 'string' || !id) throw new Error('La creación no devolvió una bóveda');
  return { id, key, name: name.trim(), type, permissions: 'ADMIN' as const, isOwner: true };
}
