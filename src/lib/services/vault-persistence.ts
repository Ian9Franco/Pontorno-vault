import type { SupabaseClient } from '@supabase/supabase-js';
import { createVaultKey, unwrapVaultKey, wrapVaultKeyForUser } from '../crypto';
import type { VaultPermission, VaultType } from '../supabase/types';

interface Membership {
  encrypted_vault_key: string;
  nonce: string;
  permissions: VaultPermission;
  vaults: { id: string; name: string; type: VaultType; owner_user_id: string } | null;
}

export async function loadOwnedVaults(client: SupabaseClient, userMasterKey: CryptoKey, userId: string) {
  const { data, error } = await client.from('vault_members')
    .select('vault_id, encrypted_vault_key, nonce, permissions, vaults ( id, name, type, owner_user_id )')
    .eq('user_id', userId);
  if (error) throw error;
  if (!data) throw new Error('No se pudieron cargar las membresías');
  const loaded = [];
  for (const row of data as unknown as Membership[]) {
    if (!row.vaults) throw new Error('Membresía sin bóveda accesible');
    let key: CryptoKey;
    try {
      key = await unwrapVaultKey(row.encrypted_vault_key, row.nonce, userMasterKey);
    } catch {
      throw new Error('No se pudo abrir la clave de una bóveda existente. No se reemplazó ningún dato. Solicita revisar el acceso a esa bóveda.');
    }
    loaded.push({ id: row.vaults.id, name: row.vaults.name, type: row.vaults.type,
      key, permissions: row.permissions, isOwner: row.vaults.owner_user_id === userId });
  }
  // Only a successful, empty membership response qualifies as first use.
  if (data.length === 0) {
    loaded.push(await createOwnedVault(client, userMasterKey, 'Mi Bóveda Personal', 'PERSONAL'));
  }
  return loaded;
}

/** Generate a key only for a new vault. The RPC atomically stores its owner wrapper. */
export async function createOwnedVault(
  client: SupabaseClient,
  userMasterKey: CryptoKey,
  name: string,
  type: 'PERSONAL' | 'SHARED',
) {
  const key = await createVaultKey();
  const wrapped = await wrapVaultKeyForUser(key, userMasterKey);
  const { data: id, error } = await client.rpc('create_owned_vault', {
    p_name: name,
    p_type: type,
    p_encrypted_vault_key: wrapped.ciphertext,
    p_nonce: wrapped.nonce,
  });
  if (error) throw error;
  if (typeof id !== 'string' || !id) throw new Error('La creación no devolvió una bóveda');
  return { id, key, name: name.trim(), type, permissions: 'ADMIN' as const, isOwner: true };
}
