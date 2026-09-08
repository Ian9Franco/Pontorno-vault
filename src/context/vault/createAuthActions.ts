import { vaultErrorMessage } from '@/lib/security/vault-access';
import { hasGoogleIdentity } from '@/lib/security/master-password';
import { createTestMasterUser, isTestMasterCredentials, isTestMasterSession, TEST_MASTER_SESSION_KEY, TEST_MASTER_STORAGE_KEY, TEST_MASTER_USER_ID, TEST_MASTER_DISPLAY_NAME, TEST_MASTER_EMAIL } from '@/lib/constants/test-master';
import { type UserCryptoSetup, createVaultKey, setupUserCrypto, unlockUserMasterKey, wrapVaultKeyForUser } from '@/lib/crypto';
import { isSupabaseConfigured, supabase } from '@/lib/supabase/client';
import { type User } from '@supabase/supabase-js';
import { DEMO_STORAGE_KEY, type StoredEncryptedDB, type UnifiedAuthParams } from './types';
import { type VaultSession } from './useVaultSession';
import type { UserCryptoRow } from '@/lib/supabase/types';

export function cryptoRecordFromRow(row: UserCryptoRow): UserCryptoSetup {
  return { kdfSalt: row.kdf_salt, kdfAlgorithm: row.kdf_algorithm, kdfParameters: row.kdf_parameters,
    encryptedUserKey: row.encrypted_user_key, userKeyNonce: row.user_key_nonce, cryptoVersion: row.crypto_version };
}
export function createAuthActions(session: VaultSession, decrypt: (key: CryptoKey, user: User | null, ticket: number) => Promise<void>) {
  const { user, setUser, setUserProfile, setAccessError, setIsConfigured, setIsLoading,
    userMasterKeyRef, userCryptoDataRef, lock, guard, authBusyRef } = session;

  async function run(operation: (ticket: number) => Promise<void>) {
    if (authBusyRef.current) throw new Error('Hay un acceso en curso. Espera a que termine.');
    authBusyRef.current = true;
    const ticket = guard.capture();
    setAccessError(null); setIsLoading(true);
    try { await operation(ticket); }
    catch (error) {
      if (guard.current(ticket)) { setAccessError(vaultErrorMessage(error)); lock(); }
      throw error;
    } finally { authBusyRef.current = false; setIsLoading(false); }
  }

  async function publish(key: CryptoKey, record: UserCryptoSetup, currentUser: User | null, ticket: number) {
    guard.assert(ticket);
    await decrypt(key, currentUser, ticket);
    guard.assert(ticket);
    userMasterKeyRef.current = key; userCryptoDataRef.current = record; setIsConfigured(true);
  }

  const unifiedAuth = ({ email, masterPassword, displayName = 'Usuario', isSignUp }: UnifiedAuthParams) => run(async ticket => {
    if (isTestMasterCredentials(email, masterPassword)) {
      localStorage.setItem(TEST_MASTER_SESSION_KEY, '1');
      try {
        const raw = localStorage.getItem(TEST_MASTER_STORAGE_KEY);
        let db: StoredEncryptedDB;
        let key: CryptoKey;
        if (raw) {
          db = JSON.parse(raw);
          if (!db.userCrypto) throw new Error('Sandbox sin configuración criptográfica.');
          key = await unlockUserMasterKey(masterPassword, db.userCrypto, false, TEST_MASTER_USER_ID);
        } else {
          const { setup, userMasterKey } = await setupUserCrypto(masterPassword, undefined, TEST_MASTER_USER_ID);
          key = userMasterKey;
          const vaultId = crypto.randomUUID();
          const wrapped = await wrapVaultKeyForUser(await createVaultKey(), key, { vaultId, userId: TEST_MASTER_USER_ID });
          guard.assert(ticket);
          db = { userCrypto: setup, profile: { id: TEST_MASTER_USER_ID, email: TEST_MASTER_EMAIL, displayName: TEST_MASTER_DISPLAY_NAME },
            vaults: [{ id: vaultId, name: 'Sandbox de pruebas', type: 'PERSONAL' }],
            vaultMembers: [{ vaultId, userId: TEST_MASTER_USER_ID, encryptedVaultKey: wrapped.ciphertext,
              nonce: wrapped.nonce, cryptoVersion: wrapped.cryptoVersion, permissions: 'ADMIN' }], credentials: [] };
          localStorage.setItem(TEST_MASTER_STORAGE_KEY, JSON.stringify(db));
        }
        await publish(key, db.userCrypto!, null, ticket);
        setUser(createTestMasterUser());
        setUserProfile(db.profile || null);
      } catch (error) { localStorage.removeItem(TEST_MASTER_SESSION_KEY); throw error; }
      return;
    }
    if (isSupabaseConfigured && supabase) {
      if (isSignUp) throw new Error('Las cuentas nuevas deben entrar con Google y elegir un secreto de bóveda independiente.');
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: masterPassword });
      guard.assert(ticket);
      if (error || !data.user) throw new Error('Correo o contraseña incorrectos. Comprueba tu acceso legado.');
      setUser(data.user);
      const result = await supabase.from('user_crypto').select('*').eq('user_id', data.user.id).maybeSingle().throwOnError();
      guard.assert(ticket);
      if (!result.data) throw new Error('No se encontró la configuración de esta cuenta. Entra con Google para configurar un secreto independiente.');
      const record = cryptoRecordFromRow(result.data);
      const key = await unlockUserMasterKey(masterPassword, record, false, data.user.id);
      await publish(key, record, data.user, ticket);
      return;
    }
    const raw = localStorage.getItem(DEMO_STORAGE_KEY);
    if (!isSignUp) {
      if (!raw) throw new Error('No se encontró la bóveda local.');
      const db: StoredEncryptedDB = JSON.parse(raw);
      if (!db.userCrypto) throw new Error('No se encontró configuración criptográfica.');
      const key = await unlockUserMasterKey(masterPassword, db.userCrypto, false, 'local-user-id');
      await publish(key, db.userCrypto, null, ticket);
      return;
    }
    if (raw !== null) throw new Error('Ya existe una bóveda en este navegador. Abre la bóveda con su contraseña maestra.');
    const { setup, userMasterKey } = await setupUserCrypto(masterPassword, undefined, 'local-user-id');
    guard.assert(ticket);
    const vaultId = crypto.randomUUID();
    const key = await createVaultKey();
    const wrapped = await wrapVaultKeyForUser(key, userMasterKey, { vaultId, userId: 'local-user-id' });
    guard.assert(ticket);
    if (localStorage.getItem(DEMO_STORAGE_KEY) !== null) throw new Error('Ya existe una bóveda local. Recarga para abrirla.');
    const profile = { id: 'local-user-id', email, displayName };
    const db: StoredEncryptedDB = { userCrypto: setup, profile,
      vaults: [{ id: vaultId, name: 'Mi Bóveda Personal', type: 'PERSONAL' }],
      vaultMembers: [{ vaultId, userId: profile.id, encryptedVaultKey: wrapped.ciphertext, nonce: wrapped.nonce,
        cryptoVersion: wrapped.cryptoVersion, permissions: 'ADMIN' }], credentials: [] };
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(db));
    setUserProfile(profile);
    await publish(userMasterKey, setup, null, ticket);
  });

  const unlock = (masterPassword: string) => run(async ticket => {
    if (isTestMasterSession()) {
      const raw = localStorage.getItem(TEST_MASTER_STORAGE_KEY);
      const db: StoredEncryptedDB | null = raw ? JSON.parse(raw) : null;
      if (!db?.userCrypto) throw new Error('No se encontró el sandbox. Vuelve a iniciar sesión.');
      const key = await unlockUserMasterKey(masterPassword, db.userCrypto, false, TEST_MASTER_USER_ID);
      await publish(key, db.userCrypto, null, ticket);
      setUser(createTestMasterUser()); setUserProfile(db.profile || null);
      return;
    }
    let record = userCryptoDataRef.current;
    if (isSupabaseConfigured && supabase && user) {
      const { data } = await supabase.from('user_crypto').select('*').eq('user_id', user.id).maybeSingle().throwOnError();
      guard.assert(ticket);
      record = data ? cryptoRecordFromRow(data) : null;
      if (!record) {
        if (!hasGoogleIdentity(user)) throw new Error('Vincula Google antes de crear un secreto independiente.');
        const { setup, userMasterKey } = await setupUserCrypto(masterPassword, undefined, user.id);
        guard.assert(ticket);
        await supabase.from('user_crypto').insert({ user_id: user.id, encrypted_user_key: setup.encryptedUserKey,
          user_key_nonce: setup.userKeyNonce, kdf_salt: setup.kdfSalt, kdf_algorithm: setup.kdfAlgorithm,
          kdf_parameters: setup.kdfParameters, crypto_version: setup.cryptoVersion }).throwOnError();
        await publish(userMasterKey, setup, user, ticket);
        return;
      }
    }
    if (!record) throw new Error('No se encontró configuración criptográfica.');
    const key = await unlockUserMasterKey(masterPassword, record, false, user?.id || 'local-user-id');
    await publish(key, record, user, ticket);
  });

  const signOut = async () => {
    const sandbox = isTestMasterSession();
    localStorage.removeItem(TEST_MASTER_SESSION_KEY);
    lock(); setUser(null); setUserProfile(null); userCryptoDataRef.current = null; setIsConfigured(false);
    if (supabase && !sandbox) {
      const { error } = await supabase.auth.signOut();
      if (error) throw new Error('La bóveda está bloqueada, pero no se pudo cerrar la sesión remota. Vuelve a intentarlo.');
    }
  };
  return { unifiedAuth, unlock, signOut };
}
