import { vaultErrorMessage } from '@/lib/security/vault-access';
import { type UserCryptoSetup, createVaultKey, setupUserCrypto, unlockUserMasterKey, wrapVaultKeyForUser } from '@/lib/crypto';
import { isSupabaseConfigured, supabase } from '@/lib/supabase/client';
import { type User } from '@supabase/supabase-js';
import { DEMO_STORAGE_KEY, type StoredEncryptedDB, type UnifiedAuthParams } from './types';
import { type VaultSession } from './useVaultSession';

/** Authentication commands relock on failure before reporting errors to the UI. */
export function createAuthActions(session: VaultSession, decryptVaultsAndCredentials: (key: CryptoKey, user: User | null) => Promise<void>) {
  const { user, setUser, setUserProfile, setAccessError, setIsConfigured, vaults, credentials, setIsLoading, userMasterKeyRef, userCryptoDataRef, lock, fetchProfile } = session;
  // Unified Authentication (Email + DisplayName + MasterPassword)
  const unifiedAuth = async ({ email, masterPassword, displayName = 'Usuario', isSignUp }: UnifiedAuthParams) => {
    setAccessError(null);
    setIsLoading(true);
    try {
      if (isSupabaseConfigured && supabase) {
        if (isSignUp) {
          const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password: masterPassword,
            options: {
              data: { display_name: displayName }
            }
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
            const { data: sData } = await supabase.auth.signInWithPassword({
              email,
              password: masterPassword,
            });
            if (sData?.user) {
              registeredUser = sData.user;
            }
          }

          setUser(registeredUser);
          setUserProfile({ id: registeredUser.id, email, displayName });

          await supabase.from('profiles').upsert({
            id: registeredUser.id,
            display_name: displayName,
          });

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
          // SIGN IN FLOW
          const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email,
            password: masterPassword,
          });

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
      } else {
        // LOCAL STANDALONE DEMO MODE
        if (isSignUp) {
          if (localStorage.getItem(DEMO_STORAGE_KEY) !== null) {
            throw new Error('Ya existe una bóveda en este navegador. Abre la bóveda con su contraseña maestra.');
          }
          const { setup, userMasterKey } = await setupUserCrypto(masterPassword);
          userMasterKeyRef.current = userMasterKey;
          userCryptoDataRef.current = setup;

          const personalVaultKey = await createVaultKey();
          const wrappedPersonalKey = await wrapVaultKeyForUser(personalVaultKey, userMasterKey);

          const personalVaultId = 'vault-personal-' + Date.now();

          const currentProfile = {
            id: 'local-user-id',
            email,
            displayName,
          };
          setUserProfile(currentProfile);

          const db: StoredEncryptedDB = {
            userCrypto: setup,
            profile: currentProfile,
            vaults: [
              { id: personalVaultId, name: `Mi Bóveda Personal`, type: 'PERSONAL' },
            ],
            vaultMembers: [
              {
                vaultId: personalVaultId,
                userId: currentProfile.id,
                encryptedVaultKey: wrappedPersonalKey.ciphertext,
                nonce: wrappedPersonalKey.nonce,
                permissions: 'ADMIN',
              },
            ],
            credentials: [],
          };
          localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(db));
          setIsConfigured(true);
          await decryptVaultsAndCredentials(userMasterKey, null);
        } else {
          const raw = localStorage.getItem(DEMO_STORAGE_KEY);
          if (!raw) throw new Error('No se encontró configuración local');
          const db: StoredEncryptedDB = JSON.parse(raw);
          if (!db.userCrypto) throw new Error('No hay registro criptográfico');

          const userMasterKey = await unlockUserMasterKey(masterPassword, db.userCrypto);
          userMasterKeyRef.current = userMasterKey;
          setIsConfigured(true);
          await decryptVaultsAndCredentials(userMasterKey, null);
        }
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

      if (!cryptoRecord) {
        throw new Error('No se encontró configuración criptográfica.');
      }

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
    lock();
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setUserProfile(null);
    userCryptoDataRef.current = null;
    setIsConfigured(false);
  };

  return { unifiedAuth, unlock, signOut };
}
