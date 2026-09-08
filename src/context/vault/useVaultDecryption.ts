'use client';
import { localVaultStorageKey, isTestMasterSession } from '@/lib/constants/test-master';


import { useCallback } from 'react';
import { loadOwnedVaults } from '@/lib/services/vault-persistence';
import { decryptCredential, unwrapVaultKey } from '@/lib/crypto';
import { isSupabaseConfigured, supabase } from '@/lib/supabase/client';
import { type User } from '@supabase/supabase-js';
import { DEMO_STORAGE_KEY, type StoredEncryptedDB, type VaultEntity, type VaultItem } from './types';
import { type VaultSession } from './useVaultSession';

/** Loads authorized vault keys and publishes decrypted records only after loading. */
export function useVaultDecryption(session: VaultSession) {
  const { user, setIsUnlocked, setActiveVaultId, vaults, setVaults, credentials, setCredentials, vaultKeysRef, lock, resetActivity } = session;
  // Helper to decrypt all user vaults & credentials
  const decryptVaultsAndCredentials = useCallback(async (userMasterKey: CryptoKey, currentUser: User | null, ticket: number) => {
    const check = () => session.guard.assert(ticket);
    check();
    const decryptedVaultEntities: VaultEntity[] = [];
    const newVaultKeys = new Map<string, CryptoKey>();
    const decryptedCredentials: VaultItem[] = [];

    if (!isTestMasterSession() && isSupabaseConfigured && supabase && currentUser) {
      try {
        const loaded = await loadOwnedVaults(supabase, userMasterKey, currentUser.id, check);
        for (const vault of loaded) {
          newVaultKeys.set(vault.id, vault.key);
          decryptedVaultEntities.push({
            id: vault.id, name: vault.name, type: vault.type, permissions: vault.permissions, isOwner: vault.isOwner,
          });
        }
      } catch (error) {
        if (session.guard.current(ticket)) lock();
        throw error;
      }

      // 2. Fetch credentials
      const vaultIds = Array.from(newVaultKeys.keys());
      if (vaultIds.length > 0) {
        const { data: credData, error: credError } = await supabase
          .from('credentials')
          .select('*')
          .in('vault_id', vaultIds);
        if (credError) throw credError;

        // Fetch creators profiles
        const creatorIds = Array.from(new Set(credData?.map((c) => c.created_by) || []));
        const profileMap = new Map<string, string>();
        if (creatorIds.length > 0) {
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, display_name')
            .in('id', creatorIds);
          profilesData?.forEach((p) => profileMap.set(p.id, p.display_name));
        }

        if (credData) {
          for (const cred of credData) {
            const vKey = newVaultKeys.get(cred.vault_id);
            if (!vKey) continue;
            try {
              const payload = await decryptCredential(
                {
                  ciphertext: cred.encrypted_payload,
                  nonce: cred.nonce,
                  cryptoVersion: cred.crypto_version,
                },
                vKey, { vaultId: cred.vault_id, credentialId: cred.id }
              );
              const creatorName = profileMap.get(cred.created_by) || 'Miembro Familiar';
              const isMe = cred.created_by === currentUser.id;

              decryptedCredentials.push({
                id: cred.id,
                vaultId: cred.vault_id,
                payload,
                updatedAt: cred.updated_at,
                createdAt: cred.created_at,
                createdBy: {
                  id: cred.created_by,
                  name: isMe ? `${creatorName} (Tú)` : creatorName,
                  isCurrentUser: isMe,
                },
              });
            } catch (e) {
              throw new Error('No se pudo descifrar una credencial existente. No se modificó ningún dato. Solicita revisar las claves de esta bóveda.');
            }
          }
        }
      }
    } else {
      // Local fallback mode
      const raw = localStorage.getItem(localVaultStorageKey(DEMO_STORAGE_KEY));
      const db: StoredEncryptedDB = raw ? JSON.parse(raw) : { userCrypto: null, vaults: [], vaultMembers: [], credentials: [] };

      for (const vm of db.vaultMembers) {
        const v = db.vaults.find((vault) => vault.id === vm.vaultId);
        if (!v) continue;
        try {
          const unwrappedVaultKey = await unwrapVaultKey(vm.encryptedVaultKey, vm.nonce, userMasterKey,
            { vaultId: vm.vaultId, userId: vm.userId, cryptoVersion: vm.cryptoVersion || 1 });
          newVaultKeys.set(vm.vaultId, unwrappedVaultKey);
          decryptedVaultEntities.push({
            id: v.id,
            name: v.name,
            type: v.type,
            permissions: vm.permissions, isOwner: true,
          });
        } catch (e) {
          throw new Error('No se pudo abrir una clave de bóveda local. No se modificaron datos.');
        }
      }

      for (const cred of db.credentials) {
        const vKey = newVaultKeys.get(cred.vaultId);
        if (!vKey) continue;
        try {
          const payload = await decryptCredential(
            {
              ciphertext: cred.encryptedPayload,
              nonce: cred.nonce,
              cryptoVersion: cred.cryptoVersion,
            },
            vKey, { vaultId: cred.vaultId, credentialId: cred.id }
          );
          decryptedCredentials.push({
            id: cred.id,
            vaultId: cred.vaultId,
            payload,
            updatedAt: cred.updatedAt,
            createdAt: cred.createdAt,
            createdBy: cred.createdBy ? { ...cred.createdBy, isCurrentUser: true } : { id: 'me', name: 'Tú', isCurrentUser: true },
          });
        } catch (e) {
          throw new Error('No se pudo descifrar una credencial local. No se modificaron datos.');
        }
      }
    }

    // Sort vaults: Family (SHARED) first, then Personal (PERSONAL)
    decryptedVaultEntities.sort((a, b) => (a.type === 'SHARED' ? -1 : 1));

    check();
    vaultKeysRef.current = newVaultKeys;
    setVaults(decryptedVaultEntities);
    if (decryptedVaultEntities.length > 0) {
      setActiveVaultId(decryptedVaultEntities[0].id);
    }
    setCredentials(decryptedCredentials);
    setIsUnlocked(true);
    resetActivity();
  }, [resetActivity, lock]);

  return decryptVaultsAndCredentials;
}
