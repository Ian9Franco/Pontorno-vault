import { vaultErrorMessage } from '@/lib/security/vault-access';
import { type UserCryptoSetup, createVaultKey, setupUserCrypto, unlockUserMasterKey, wrapVaultKeyForUser } from '@/lib/crypto';
import {
  TEST_MASTER_DISPLAY_NAME,
  TEST_MASTER_EMAIL,
  TEST_MASTER_PASSWORD,
  TEST_MASTER_SESSION_KEY,
  TEST_MASTER_USER_ID,
  isTestMasterCredentials,
  isTestMasterSession,
} from '@/lib/constants/test-master';
import { isSupabaseConfigured, supabase } from '@/lib/supabase/client';
import { type User } from '@supabase/supabase-js';
import { DEMO_STORAGE_KEY, type StoredEncryptedDB, type UnifiedAuthParams } from './types';
import { type VaultSession } from './useVaultSession';

function createTestMasterUser(): User {
  return {
    id: TEST_MASTER_USER_ID,
    aud: 'authenticated',
    role: 'authenticated',
    email: TEST_MASTER_EMAIL,
    app_metadata: { provider: 'test-master', providers: ['test-master'] },
    user_metadata: { display_name: TEST_MASTER_DISPLAY_NAME, test_master: true },
    created_at: new Date(0).toISOString(),
  } as User;
}

/** Authentication commands relock on failure before reporting errors to the UI. */
export function createAuthActions(session: VaultSession, decryptVaultsAndCredentials: (key: CryptoKey, user: User | null) => Promise<void>) {
  const { user, setUser, setUserProfile, setAccessError, setIsConfigured, setIsLoading, userMasterKeyRef, userCryptoDataRef, lock, fetchProfile } = session;

  const createLocalVault = async (email: string, masterPassword: string, displayName: string, profileId = 'local-user-id') => {
    const { setup, userMasterKey } = await setupUserCrypto(masterPassword);
    userMasterKeyRef.current = userMasterKey;
    userCryptoDataRef.current = setup;

    const personalVaultKey = await createVaultKey();
    const wrappedPersonalKey = await wrapVaultKeyForUser(personalVaultKey, userMasterKey);
    const personalVaultId = 'vault-personal-' + Date.now();
    const currentProfile = { id: profileId, email, displayName };

    const db: StoredEncryptedDB = {
      userCrypto: setup,
      profile: currentProfile,
      vaults: [{ id: personalVaultId, name: 'Mi Bóveda Personal', type: 'PERSONAL' }],
      vaultMembers: [{
        vaultId: personalVaultId,
        userId: currentProfile.id,
        encryptedVaultKey: wrappedPersonalKey.ciphertext,
        nonce: wrappedPersonalKey.nonce,
        permissions: 'ADMIN',
      }],
      credentials: [],
    };

    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(db));
    setUserProfile(currentProfile);
    setIsConfigured(true);
    await decryptVaultsAndCredentials(userMasterKey, null);
  };

  const unlockLocalVault = async (masterPassword: string) => {
    const raw = localStorage.getItem(DEMO_STORAGE_KEY);
    if (!raw) throw new Error('No se encontró configuración local');
    const db: StoredEncryptedDB = JSON.parse(raw);
    if (!db.userCrypto) throw new Error('No hay registro criptográfico');

    const userMasterKey = await unlockUserMasterKey(masterPassword, db.userCrypto);
    userMasterKeyRef.current = userMasterKey;
    userCryptoDataRef.current = db.userCrypto;
    if (db.profile) setUserProfile(db.profile);
    setIsConfigured(true);
    await decryptVaultsAndCredentials(userMasterKey, null);
  };

  // Unified Authentication (Email + DisplayName + MasterPassword)
  const unifiedAuth = async ({ email, masterPassword, displayName = 'Usuario', isSignUp }: UnifiedAuthParams) => {
    setAccessError(null);
    setIsLoading(true);
    try {
      // Public test account: deliberately isolated from Supabase and real/shared vault data.
      if (isTestMasterCredentials(email, masterPassword)) {
        if (localStorage.getItem(DEMO_STORAGE_KEY) === null) {
          await createLocalVault(TEST_MASTER_EMAIL, TEST_MASTER_PASSWORD, TEST_MASTER_DISPLAY_NAME, TEST_MASTER_USER_ID);
        } else {
          await unlockLocalVault(TEST_MASTER_PASSWORD);
        }
        setUser(createTestMasterUser());
        localStorage.setItem(TEST_MASTER_SESSION_KEY, '1');
        return;
      }

      if (isSupabaseConfigured && supabase) {
        if (isSignUp) {
          const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password: masterPassword,
            options: { data: { display_name: displayName } },
          });

          if (authError) {
            if (authError.message.toLowerCase().includes('already registered')) {
              throw new Error('Este correo ya está registrado. Por favor, selecciona "Iniciar sesión" abajo.');
            }
            throw new Error(`Error al registrar usuario: ${authError.message}`);
          }

          let registeredUser = authData.user;
          if (!registeredUser) throw new Error('No se pudo crear el usuario en Supabase');

          if (!authData.session) {
            const { data: sData } = await supabase.auth.signInWithPassword({ email, password: masterPassword });
            if (sData?.user) registeredUser = sData.user;
          }

          setUser(registeredUser);
          setUserProfile({ id: registeredUser.id, email, displayName });
          await supabase.from('profiles').upsert({ id: registeredUser.id, display_name: displayName });

          const { setup, userMasterKey } = await setupUserCrypto(masterPassword);
          userMasterKeyRef.current = userMasterKey;
          userCryptoDataRef.current = setup;

          await supabase.from('user_crypto').insert({
            user_id: registeredUser.id,
            encrypted_user_key: setup.encryptedUserKey,
            user_key_nonce: setup.userKeyNonce,
            kdf_salt: setup.kdfSalt,
            kdf_algorithm: setup.kdfAlgorithm,
            kdf_parameters: setup.kdfParameters,
            crypto_version: setup.cryptoVersion,
          }).throwOnError();

          setIsConfigured(true);
          await decryptVaultsAndCredentials(userMasterKey, registeredUser);
        } else {
          const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password: masterPassword });

          if (authError) {
            if (authError.message.toLowerCase().includes('invalid login credentials')) {
              throw new Error('Correo o contraseña incorrectos. Si no tienes cuenta aún, haz clic en "Registrarse".');
            }
            throw new Error(`Error al iniciar sesión: ${authError.message}`);
          }

          const loggedInUser = authData.user;
          if (!loggedInUser) throw new Error('Error al iniciar sesión');

          setUser(loggedInUser);
          await fetchProfile(loggedInUser);

          const { data: cryptoData } = await supabase
            .from('user_crypto')
            .select('*')
            .eq('user_id', loggedInUser.id)
            .maybeSingle().throwOnError();

          let userCryptoRecord: UserCryptoSetup;
          let userMasterKey: CryptoKey;

          if (!cryptoData) {
            const { setup, userMasterKey: newKey } = await setupUserCrypto(masterPassword);
            userMasterKey = newKey;
            userCryptoRecord = setup;

            await supabase.from('user_crypto').insert({
              user_id: loggedInUser.id,
              encrypted_user_key: setup.encryptedUserKey,
              user_key_nonce: setup.userKeyNonce,
              kdf_salt: setup.kdfSalt,
              kdf_algorithm: setup.kdfAlgorithm,
              kdf_parameters: setup.kdfParameters,
              crypto_version: setup.cryptoVersion,
            }).throwOnError();
          } else {
            userCryptoRecord = {
              kdfSalt: cryptoData.kdf_salt,
              kdfAlgorithm: cryptoData.kdf_algorithm,
              kdfParameters: cryptoData.kdf_parameters,
              encryptedUserKey: cryptoData.encrypted_user_key,
              userKeyNonce: cryptoData.user_key_nonce,
              cryptoVersion: cryptoData.crypto_version,
            };
            userMasterKey = await unlockUserMasterKey(masterPassword, userCryptoRecord);
          }

          userMasterKeyRef.current = userMasterKey;
          userCryptoDataRef.current = userCryptoRecord;
          setIsConfigured(true);
          await decryptVaultsAndCredentials(userMasterKey, loggedInUser);
        }
      } else if (isSignUp) {
        if (localStorage.getItem(DEMO_STORAGE_KEY) !== null) {
          throw new Error('Ya existe una bóveda en este navegador. Abre la bóveda con su contraseña maestra.');
        }
        await createLocalVault(email, masterPassword, displayName);
      } else {
        await unlockLocalVault(masterPassword);
      }
    } catch (error) {
      setAccessError(vaultErrorMessage(error));
      lock();
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Unlock Vault (when already authenticated in Supabase but vault is locked)
  const unlock = async (masterPassword: string) => {
    setIsLoading(true);
    try {
      if (isTestMasterSession()) {
        if (masterPassword !== TEST_MASTER_PASSWORD) throw new Error('Contraseña maestra incorrecta.');
        await unlockLocalVault(masterPassword);
        setUser(createTestMasterUser());
        return;
      }

      let cryptoRecord = userCryptoDataRef.current;

      if (!cryptoRecord && isSupabaseConfigured && supabase && user) {
        const { data: cryptoData } = await supabase
          .from('user_crypto')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle().throwOnError();

        if (cryptoData) {
          cryptoRecord = {
            kdfSalt: cryptoData.kdf_salt,
            kdfAlgorithm: cryptoData.kdf_algorithm,
            kdfParameters: cryptoData.kdf_parameters,
            encryptedUserKey: cryptoData.encrypted_user_key,
            userKeyNonce: cryptoData.user_key_nonce,
            cryptoVersion: cryptoData.crypto_version,
          };
          userCryptoDataRef.current = cryptoRecord;
        } else {
          const { setup, userMasterKey } = await setupUserCrypto(masterPassword);
          userMasterKeyRef.current = userMasterKey;
          userCryptoDataRef.current = setup;

          await supabase.from('user_crypto').insert({
            user_id: user.id,
            encrypted_user_key: setup.encryptedUserKey,
            user_key_nonce: setup.userKeyNonce,
            kdf_salt: setup.kdfSalt,
            kdf_algorithm: setup.kdfAlgorithm,
            kdf_parameters: setup.kdfParameters,
            crypto_version: setup.cryptoVersion,
          }).throwOnError();

          setIsConfigured(true);
          await decryptVaultsAndCredentials(userMasterKey, user);
          return;
        }
      }

      if (!cryptoRecord) throw new Error('No se encontró configuración criptográfica.');

      let userMasterKey: CryptoKey;
      try {
        userMasterKey = await unlockUserMasterKey(masterPassword, cryptoRecord);
      } catch {
        throw new Error('Contraseña maestra incorrecta.');
      }

      userMasterKeyRef.current = userMasterKey;
      await decryptVaultsAndCredentials(userMasterKey, user);
    } catch (error) {
      lock();
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    const wasTestMaster = isTestMasterSession();
    localStorage.removeItem(TEST_MASTER_SESSION_KEY);
    lock();
    if (supabase && !wasTestMaster) await supabase.auth.signOut();
    setUser(null);
    setUserProfile(null);
    userCryptoDataRef.current = null;
    setIsConfigured(false);
  };

  return { unifiedAuth, unlock, signOut };
}
