import { localVaultStorageKey, isTestMasterSession, isTestMasterUser } from '@/lib/constants/test-master';
import { canWriteCredentials, canManageVault, assertMutationSucceeded } from '@/lib/security/vault-access';
import { createOwnedVault } from '@/lib/services/vault-persistence';
import { type CredentialPayload, createVaultKey, encryptCredential, rotateMasterPassword, wrapVaultKeyForUser } from '@/lib/crypto';
import { isSupabaseConfigured, supabase } from '@/lib/supabase/client';
import { DEMO_STORAGE_KEY, type StoredEncryptedDB, type VaultEntity, type VaultItem, type CreatorInfo } from './types';
import { type VaultSession } from './useVaultSession';
import { hasGoogleIdentity } from '@/lib/security/master-password';
import { hardenSymmetricKey } from '@/lib/crypto';

/** Permission-checked writes update the view after persistence succeeds. */
export function createMutationActions(session: VaultSession) {
  const { user, userProfile, setUserProfile, isUnlocked, activeVaultId, setActiveVaultId, vaults, setVaults, credentials, setCredentials, userMasterKeyRef, vaultKeysRef, userCryptoDataRef, resetActivity } = session;
  // Save (Add or Update) Credential
  const saveCredential = async (payload: CredentialPayload, credentialId?: string, targetVaultId?: string) => {
    const ticket = session.guard.capture();
    const existing = credentialId ? credentials.find(c => c.id === credentialId) : null;
    if (credentialId && !existing) throw new Error('La credencial ya no está disponible. Recarga la bóveda.');
    if (existing && targetVaultId && targetVaultId !== existing.vaultId) throw new Error('No se puede mover una credencial al editarla.');
    const vaultIdToUse = existing?.vaultId || targetVaultId || activeVaultId;
    if (!isUnlocked || !canWriteCredentials(vaults.find(v => v.id === vaultIdToUse))) throw new Error('No tienes permiso de escritura en esta bóveda.');
    if (!vaultIdToUse) throw new Error('No active vault selected');
    const vaultKey = vaultKeysRef.current.get(vaultIdToUse);
    if (!vaultKey) throw new Error('Vault key not available');

    const writingId = credentialId || crypto.randomUUID();
    const encrypted = await encryptCredential(payload, vaultKey, { vaultId: vaultIdToUse, credentialId: writingId });
    session.guard.assert(ticket);
    const updatedAt = new Date().toISOString();
    const currentUserName = userProfile?.displayName || 'Tú';

    let creatorInfo: CreatorInfo = {
      id: user?.id || 'local-user',
      name: `${currentUserName} (Tú)`,
      isCurrentUser: true,
    };

    if (!isTestMasterSession() && !isTestMasterUser(user) && isSupabaseConfigured && supabase && user) {
      if (credentialId) {
        const result = await supabase
          .from('credentials')
          .update({
            encrypted_payload: encrypted.ciphertext,
            nonce: encrypted.nonce,
            crypto_version: encrypted.cryptoVersion,
            updated_at: updatedAt,
          })
          .eq('id', credentialId).select('id').maybeSingle();
        assertMutationSucceeded(result);
      } else {
        const { data, error } = await supabase
          .from('credentials')
          .insert({
            id: writingId,
            vault_id: vaultIdToUse,
            encrypted_payload: encrypted.ciphertext,
            nonce: encrypted.nonce,
            crypto_version: encrypted.cryptoVersion,
            created_by: user.id,
          })
          .select()
          .single();
        if (error) throw error;
        credentialId = data.id;
      }
    } else {
      const id = writingId;
      credentialId = id;
      const raw = localStorage.getItem(localVaultStorageKey(DEMO_STORAGE_KEY, user));
      const db: StoredEncryptedDB = raw ? JSON.parse(raw) : { userCrypto: null, vaults: [], vaultMembers: [], credentials: [] };

      const existingIndex = db.credentials.findIndex((c) => c.id === id);
      const newEncryptedRecord = {
        id,
        vaultId: vaultIdToUse,
        encryptedPayload: encrypted.ciphertext,
        nonce: encrypted.nonce,
        cryptoVersion: encrypted.cryptoVersion,
        createdBy: creatorInfo,
        updatedAt,
        createdAt: existingIndex >= 0 ? db.credentials[existingIndex].createdAt : updatedAt,
      };

      if (existingIndex >= 0) {
        db.credentials[existingIndex] = newEncryptedRecord;
      } else {
        db.credentials.push(newEncryptedRecord);
      }
      localStorage.setItem(localVaultStorageKey(DEMO_STORAGE_KEY, user), JSON.stringify(db));
    }

    session.guard.assert(ticket);
    // Update in-memory state
    setCredentials((prev) => {
      const idx = prev.findIndex((c) => c.id === credentialId);
      const item: VaultItem = {
        id: credentialId!,
        vaultId: vaultIdToUse,
        payload,
        updatedAt,
        createdBy: creatorInfo,
      };
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], payload, updatedAt };
        return copy;
      }
      return [item, ...prev];
    });
    resetActivity();
  };

  // Remove Credential
  const removeCredential = async (credentialId: string) => {
    const item = credentials.find(c => c.id === credentialId);
    if (!isUnlocked || !item || !canWriteCredentials(vaults.find(v => v.id === item.vaultId))) throw new Error('No tienes permiso para eliminar esta credencial.');
    if (!isTestMasterSession() && !isTestMasterUser(user) && isSupabaseConfigured && supabase) {
      const result = await supabase.from('credentials').delete().eq('id', credentialId).select('id').maybeSingle();
      assertMutationSucceeded(result);
    } else {
      const raw = localStorage.getItem(localVaultStorageKey(DEMO_STORAGE_KEY, user));
      if (raw) {
        const db: StoredEncryptedDB = JSON.parse(raw);
        db.credentials = db.credentials.filter((c) => c.id !== credentialId);
        localStorage.setItem(localVaultStorageKey(DEMO_STORAGE_KEY, user), JSON.stringify(db));
      }
    }
    setCredentials((prev) => prev.filter((c) => c.id !== credentialId));
    resetActivity();
  };

  // Create Vault (Personal or Shared)
  const createVault = async (name: string, type: 'PERSONAL' | 'SHARED') => {
    const ticket = session.guard.capture();
    if (!userMasterKeyRef.current) throw new Error('Usuario no desbloqueado');
    if (!isTestMasterSession() && !isTestMasterUser(user) && isSupabaseConfigured && supabase && user) {
      const created = await createOwnedVault(supabase, userMasterKeyRef.current, name, type, user.id, () => session.guard.assert(ticket));
      session.guard.assert(ticket);
      vaultKeysRef.current.set(created.id, created.key);
      const newEntity: VaultEntity = {
        id: created.id, name: created.name, type: created.type, permissions: created.permissions, isOwner: true,
      };
      setVaults((prev) => [...prev, newEntity]);
      setActiveVaultId(created.id);
    } else {
      const newVaultKey = await createVaultKey();
      session.guard.assert(ticket);
      const newVaultId = crypto.randomUUID();
      const wrappedVaultKey = await wrapVaultKeyForUser(newVaultKey, userMasterKeyRef.current!, { vaultId: newVaultId, userId: user?.id || 'local-user-id' });
      const hardenedKey = await hardenSymmetricKey(newVaultKey, ['encrypt', 'decrypt']);
      session.guard.assert(ticket);
      vaultKeysRef.current.set(newVaultId, hardenedKey);

      const raw = localStorage.getItem(localVaultStorageKey(DEMO_STORAGE_KEY, user));
      const db: StoredEncryptedDB = raw ? JSON.parse(raw) : { userCrypto: null, vaults: [], vaultMembers: [], credentials: [] };

      db.vaults.push({ id: newVaultId, name, type });
      db.vaultMembers.push({
        vaultId: newVaultId,
        userId: user?.id || 'local-user-id',
        encryptedVaultKey: wrappedVaultKey.ciphertext,
        nonce: wrappedVaultKey.nonce,
        cryptoVersion: wrappedVaultKey.cryptoVersion,
        permissions: 'ADMIN',
      });

      localStorage.setItem(localVaultStorageKey(DEMO_STORAGE_KEY, user), JSON.stringify(db));
      const newEntity: VaultEntity = { id: newVaultId, name, type, permissions: 'ADMIN', isOwner: true };
      setVaults((prev) => [...prev, newEntity]);
      setActiveVaultId(newVaultId);
    }
    resetActivity();
  };

  // Change Master Password
  const changeMasterPassword = async (oldPass: string, newPass: string) => {
    if (isTestMasterSession() || isTestMasterUser(user)) throw new Error('La cuenta pública de prueba conserva su contraseña fija.');
    const ticket = session.guard.capture();
    if (!isUnlocked || !userMasterKeyRef.current) throw new Error('Desbloquea la bóveda antes de cambiar el secreto.');
    if (!isTestMasterSession() && !isTestMasterUser(user) && isSupabaseConfigured && !hasGoogleIdentity(user)) throw new Error('Vincula Google antes de cambiar el secreto de bóveda.');
    const cryptoRecord = userCryptoDataRef.current;
    if (!cryptoRecord) throw new Error('No crypto configuration found');

    const { updatedSetup, userMasterKey } = await rotateMasterPassword(oldPass, newPass, cryptoRecord, undefined, user?.id || 'local-user-id');
    session.guard.assert(ticket);


    if (!isTestMasterSession() && !isTestMasterUser(user) && isSupabaseConfigured && supabase && user) {
      const result = await supabase
        .from('user_crypto')
        .update({
          encrypted_user_key: updatedSetup.encryptedUserKey,
          user_key_nonce: updatedSetup.userKeyNonce,
          kdf_salt: updatedSetup.kdfSalt,
          kdf_parameters: updatedSetup.kdfParameters,
          crypto_version: updatedSetup.cryptoVersion,
        })
        .eq('user_id', user.id).eq('encrypted_user_key', cryptoRecord.encryptedUserKey).select('user_id').maybeSingle();
      assertMutationSucceeded(result);
    } else {
      const raw = localStorage.getItem(localVaultStorageKey(DEMO_STORAGE_KEY, user));
      if (raw) {
        const db: StoredEncryptedDB = JSON.parse(raw);
        if (db.userCrypto?.encryptedUserKey !== cryptoRecord.encryptedUserKey) throw new Error('La configuración cambió. Recarga la bóveda antes de rotar.');
        db.userCrypto = updatedSetup;
        localStorage.setItem(localVaultStorageKey(DEMO_STORAGE_KEY, user), JSON.stringify(db));
      }
    }
    session.guard.assert(ticket);
    userMasterKeyRef.current = userMasterKey;
    userCryptoDataRef.current = updatedSetup;
    resetActivity();
  };

  // Update Vault (Rename / Change Type)
  const updateVault = async (vaultId: string, name: string, type: 'PERSONAL' | 'SHARED') => {
    if (!isUnlocked || !canManageVault(vaults.find(v => v.id === vaultId))) throw new Error('Solo el propietario puede administrar esta bóveda.');
    if (!isTestMasterSession() && !isTestMasterUser(user) && isSupabaseConfigured && supabase) {
      const result = await supabase
        .from('vaults')
        .update({ name, type, updated_at: new Date().toISOString() })
        .eq('id', vaultId).select('id').maybeSingle();
      assertMutationSucceeded(result);
    } else {
      const raw = localStorage.getItem(localVaultStorageKey(DEMO_STORAGE_KEY, user));
      if (raw) {
        const db: StoredEncryptedDB = JSON.parse(raw);
        const v = db.vaults.find((item) => item.id === vaultId);
        if (v) {
          v.name = name;
          v.type = type;
          localStorage.setItem(localVaultStorageKey(DEMO_STORAGE_KEY, user), JSON.stringify(db));
        }
      }
    }

    setVaults((prev) =>
      prev.map((v) => (v.id === vaultId ? { ...v, name, type } : v))
    );
    resetActivity();
  };

  // Remove Vault
  const removeVault = async (vaultId: string) => {
    if (!isUnlocked || !canManageVault(vaults.find(v => v.id === vaultId))) throw new Error('Solo el propietario puede eliminar esta bóveda.');
    if (!isTestMasterSession() && !isTestMasterUser(user) && isSupabaseConfigured && supabase) {
      const result = await supabase.from('vaults').delete().eq('id', vaultId).select('id').maybeSingle();
      assertMutationSucceeded(result);
    } else {
      const raw = localStorage.getItem(localVaultStorageKey(DEMO_STORAGE_KEY, user));
      if (raw) {
        const db: StoredEncryptedDB = JSON.parse(raw);
        db.vaults = db.vaults.filter((v) => v.id !== vaultId);
        db.vaultMembers = db.vaultMembers.filter((vm) => vm.vaultId !== vaultId);
        db.credentials = db.credentials.filter((c) => c.vaultId !== vaultId);
        localStorage.setItem(localVaultStorageKey(DEMO_STORAGE_KEY, user), JSON.stringify(db));
      }
    }

    vaultKeysRef.current.delete(vaultId);
    setCredentials((prev) => prev.filter((c) => c.vaultId !== vaultId));
    setVaults((prev) => {
      const remaining = prev.filter((v) => v.id !== vaultId);
      if (activeVaultId === vaultId && remaining.length > 0) {
        setActiveVaultId(remaining[0].id);
      }
      return remaining;
    });
    resetActivity();
  };

  const updateDisplayName = async (newName: string) => {
    if (!newName.trim()) return;
    if (!isTestMasterSession() && !isTestMasterUser(user) && isSupabaseConfigured && supabase && user) {
      const result = await supabase.from('profiles').upsert({
        id: user.id,
        display_name: newName.trim(),
      }).select('id').maybeSingle();
      assertMutationSucceeded(result);
    } else {
      const storageKey = localVaultStorageKey(DEMO_STORAGE_KEY, user);
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const db: StoredEncryptedDB = JSON.parse(raw);
        if (db.profile) db.profile.displayName = newName.trim();
        localStorage.setItem(storageKey, JSON.stringify(db));
      }
    }
    setUserProfile((prev) => prev ? { ...prev, displayName: newName.trim() } : null);
  };

  return { saveCredential, removeCredential, createVault, updateVault, removeVault, changeMasterPassword, updateDisplayName };
}
