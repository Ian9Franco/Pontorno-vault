'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import {
  CredentialPayload,
  UserCryptoSetup,
  createVaultKey,
  decryptCredential,
  encryptCredential,
  rotateMasterPassword,
  setupUserCrypto,
  unlockUserMasterKey,
  unwrapVaultKey,
  wrapVaultKeyForUser,
} from '@/lib/crypto';
import { isSupabaseConfigured, supabase } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';

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
}

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
}

interface UnifiedAuthParams {
  email: string;
  masterPassword: string;
  displayName?: string;
  isSignUp: boolean;
}

interface VaultContextType {
  user: User | null;
  userProfile: UserProfile | null;
  isUnlocked: boolean;
  isConfigured: boolean;
  isSupabaseConnected: boolean;
  activeVaultId: string | null;
  vaults: VaultEntity[];
  credentials: VaultItem[];
  isLoading: boolean;
  autoLockMinutes: number;
  timeRemainingSeconds: number;
  setActiveVaultId: (id: string) => void;
  setAutoLockMinutes: (minutes: number) => void;
  unifiedAuth: (params: UnifiedAuthParams) => Promise<void>;
  signOut: () => Promise<void>;
  unlock: (masterPassword: string) => Promise<void>;
  lock: () => void;
  saveCredential: (payload: CredentialPayload, credentialId?: string) => Promise<void>;
  removeCredential: (credentialId: string) => Promise<void>;
  addSharedVault: (name: string) => Promise<void>;
  changeMasterPassword: (oldPass: string, newPass: string) => Promise<void>;
  updateDisplayName: (newName: string) => Promise<void>;
}

const VaultContext = createContext<VaultContextType | null>(null);

const DEMO_STORAGE_KEY = 'family_vault_encrypted_store_v1';

interface StoredEncryptedDB {
  userCrypto: UserCryptoSetup | null;
  profile?: { id: string; email: string; displayName: string };
  vaults: Array<{ id: string; name: string; type: 'PERSONAL' | 'SHARED' }>;
  vaultMembers: Array<{ vaultId: string; userId: string; encryptedVaultKey: string; nonce: string; permissions: 'READ' | 'WRITE' | 'ADMIN' }>;
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

export function VaultProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const [activeVaultId, setActiveVaultId] = useState<string | null>(null);
  const [vaults, setVaults] = useState<VaultEntity[]>([]);
  const [credentials, setCredentials] = useState<VaultItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [autoLockMinutes, setAutoLockMinutesState] = useState(5);
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState(300);

  // In-memory cryptographic session (cleared immediately upon lock)
  const userMasterKeyRef = useRef<CryptoKey | null>(null);
  const vaultKeysRef = useRef<Map<string, CryptoKey>>(new Map());
  const userCryptoDataRef = useRef<UserCryptoSetup | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  // Lock function: wipes plaintext keys and decrypted credentials from memory
  const lock = useCallback(() => {
    userMasterKeyRef.current = null;
    vaultKeysRef.current.clear();
    setCredentials([]);
    setIsUnlocked(false);
  }, []);

  // Fetch user profile from Supabase
  const fetchProfile = useCallback(async (currentUser: User | null) => {
    if (!currentUser) {
      setUserProfile(null);
      return;
    }

    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle();

      const name = data?.display_name || currentUser.user_metadata?.display_name || currentUser.email?.split('@')[0] || 'Usuario';
      setUserProfile({
        id: currentUser.id,
        email: currentUser.email || '',
        displayName: name,
      });
    } else {
      const raw = localStorage.getItem(DEMO_STORAGE_KEY);
      const parsed: StoredEncryptedDB = raw ? JSON.parse(raw) : null;
      setUserProfile(parsed?.profile || {
        id: currentUser.id,
        email: currentUser.email || 'demo@familyvault.app',
        displayName: 'Usuario Familiar',
      });
    }
  }, []);

  // Check Supabase session & user_crypto configuration
  const checkUserCryptoStatus = useCallback(async (currentUser: User | null) => {
    if (isSupabaseConfigured && supabase && currentUser) {
      const { data, error } = await supabase
        .from('user_crypto')
        .select('*')
        .eq('user_id', currentUser.id)
        .maybeSingle();

      if (data && !error) {
        userCryptoDataRef.current = {
          kdfSalt: data.kdf_salt,
          kdfAlgorithm: data.kdf_algorithm,
          kdfParameters: data.kdf_parameters,
          encryptedUserKey: data.encrypted_user_key,
          userKeyNonce: data.user_key_nonce,
          cryptoVersion: data.crypto_version,
        };
        setIsConfigured(true);
      } else {
        setIsConfigured(false);
      }
    } else {
      try {
        const raw = localStorage.getItem(DEMO_STORAGE_KEY);
        if (raw) {
          const parsed: StoredEncryptedDB = JSON.parse(raw);
          if (parsed.userCrypto) {
            userCryptoDataRef.current = parsed.userCrypto;
            setIsConfigured(true);
          }
          if (parsed.profile) {
            setUserProfile(parsed.profile);
          }
        }
      } catch (e) {
        console.error('Error reading storage state', e);
      }
    }
  }, []);

  // Initial load
  useEffect(() => {
    const init = async () => {
      try {
        if (isSupabaseConfigured && supabase) {
          const { data: { session } } = await supabase.auth.getSession();
          const currentUser = session?.user || null;
          setUser(currentUser);
          if (currentUser) {
            await fetchProfile(currentUser);
            await checkUserCryptoStatus(currentUser);
          }
        } else {
          await checkUserCryptoStatus(null);
        }
      } catch (e) {
        console.error('Error initializing auth state', e);
      } finally {
        setIsLoading(false);
      }
    };
    init();

    if (isSupabaseConfigured && supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
        const currentUser = session?.user || null;
        setUser(currentUser);
        if (!currentUser) {
          lock();
          setUserProfile(null);
          setIsConfigured(false);
        }
      });
      return () => subscription.unsubscribe();
    }
  }, [checkUserCryptoStatus, fetchProfile, lock]);

  // Activity tracker for Auto-Lock
  const resetActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    setTimeRemainingSeconds(autoLockMinutes * 60);
  }, [autoLockMinutes]);

  useEffect(() => {
    if (!isUnlocked) return;

    const interval = setInterval(() => {
      const elapsedSec = Math.floor((Date.now() - lastActivityRef.current) / 1000);
      const remaining = Math.max(0, autoLockMinutes * 60 - elapsedSec);
      setTimeRemainingSeconds(remaining);

      if (remaining <= 0) {
        lock();
      }
    }, 1000);

    const onUserActivity = () => resetActivity();
    window.addEventListener('mousemove', onUserActivity);
    window.addEventListener('keydown', onUserActivity);
    window.addEventListener('touchstart', onUserActivity);

    return () => {
      clearInterval(interval);
      window.removeEventListener('mousemove', onUserActivity);
      window.removeEventListener('keydown', onUserActivity);
      window.removeEventListener('touchstart', onUserActivity);
    };
  }, [isUnlocked, autoLockMinutes, lock, resetActivity]);

  // Helper to decrypt all user vaults & credentials
  const decryptVaultsAndCredentials = useCallback(async (userMasterKey: CryptoKey, currentUser: User | null) => {
    const decryptedVaultEntities: VaultEntity[] = [];
    const newVaultKeys = new Map<string, CryptoKey>();
    const decryptedCredentials: VaultItem[] = [];

    if (isSupabaseConfigured && supabase && currentUser) {
      // 1. Fetch user's vaults from Supabase
      const { data: memberData, error: memberError } = await supabase
        .from('vault_members')
        .select('vault_id, encrypted_vault_key, nonce, permissions, vaults ( id, name, type )');
      if (memberError) throw memberError;

      if (memberData) {
        for (const row of memberData as any[]) {
          const vault = row.vaults;
          if (!vault) continue;

          try {
            const unwrappedKey = await unwrapVaultKey(
              row.encrypted_vault_key,
              row.nonce,
              userMasterKey
            );
            newVaultKeys.set(vault.id, unwrappedKey);
            decryptedVaultEntities.push({
              id: vault.id,
              name: vault.name,
              type: vault.type,
              permissions: row.permissions,
            });
          } catch (e) {
            console.error('Error unwrapping vault key for', vault.name, e);
          }
        }
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
                vKey
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
              console.error(`Failed to decrypt cred ${cred.id}`, e);
            }
          }
        }
      }
    } else {
      // Local fallback mode
      const raw = localStorage.getItem(DEMO_STORAGE_KEY);
      const db: StoredEncryptedDB = raw ? JSON.parse(raw) : { userCrypto: null, vaults: [], vaultMembers: [], credentials: [] };

      for (const vm of db.vaultMembers) {
        const v = db.vaults.find((vault) => vault.id === vm.vaultId);
        if (!v) continue;
        try {
          const unwrappedVaultKey = await unwrapVaultKey(vm.encryptedVaultKey, vm.nonce, userMasterKey);
          newVaultKeys.set(vm.vaultId, unwrappedVaultKey);
          decryptedVaultEntities.push({
            id: v.id,
            name: v.name,
            type: v.type,
            permissions: vm.permissions,
          });
        } catch (e) {
          console.error(e);
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
            vKey
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
          console.error(e);
        }
      }
    }

    // Sort vaults: Family (SHARED) first, then Personal (PERSONAL)
    decryptedVaultEntities.sort((a, b) => (a.type === 'SHARED' ? -1 : 1));

    vaultKeysRef.current = newVaultKeys;
    setVaults(decryptedVaultEntities);
    if (decryptedVaultEntities.length > 0) {
      setActiveVaultId(decryptedVaultEntities[0].id);
    }
    setCredentials(decryptedCredentials);
    setIsUnlocked(true);
    resetActivity();
  }, [resetActivity]);

  // Unified 1-Step Authentication (Email + DisplayName + MasterPassword)
  const unifiedAuth = async ({ email, masterPassword, displayName = 'Usuario', isSignUp }: UnifiedAuthParams) => {
    setIsLoading(true);
    try {
      if (isSupabaseConfigured && supabase) {
        if (isSignUp) {
          // 1. Sign Up in Supabase Auth
          const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password: masterPassword,
            options: {
              data: { display_name: displayName }
            }
          });
          if (authError) throw authError;
          const registeredUser = authData.user;
          if (!registeredUser) throw new Error('No se pudo crear la cuenta');

          setUser(registeredUser);
          setUserProfile({ id: registeredUser.id, email, displayName });

          // 2. Save profile
          await supabase.from('profiles').upsert({
            id: registeredUser.id,
            display_name: displayName,
          });

          // 3. Cryptographic Identity Setup
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
          });

          // 4. Create or Join Shared Family Vault
          let familyVaultId: string | null = null;
          let familyVaultKey: CryptoKey | null = null;

          const { data: existingFamilyVault } = await supabase
            .from('vaults')
            .select('id, name')
            .eq('type', 'SHARED')
            .maybeSingle();

          if (!existingFamilyVault) {
            // First member creates the Shared Family Vault
            familyVaultKey = await createVaultKey();
            const { data: newVault, error: vErr } = await supabase
              .from('vaults')
              .insert({
                owner_user_id: registeredUser.id,
                name: 'Bóveda Familiar Pontorno',
                type: 'SHARED',
              })
              .select()
              .single();
            if (vErr) throw vErr;
            familyVaultId = newVault.id;

            const wrappedFamilyKey = await wrapVaultKeyForUser(familyVaultKey, userMasterKey);
            await supabase.from('vault_members').insert({
              vault_id: familyVaultId,
              user_id: registeredUser.id,
              encrypted_vault_key: wrappedFamilyKey.ciphertext,
              nonce: wrappedFamilyKey.nonce,
              permissions: 'ADMIN',
            });
          } else {
            familyVaultId = existingFamilyVault.id;
            // For subsequent members, create shared vault key wrapper
            familyVaultKey = await createVaultKey();
            const wrappedFamilyKey = await wrapVaultKeyForUser(familyVaultKey, userMasterKey);
            await supabase.from('vault_members').upsert({
              vault_id: familyVaultId,
              user_id: registeredUser.id,
              encrypted_vault_key: wrappedFamilyKey.ciphertext,
              nonce: wrappedFamilyKey.nonce,
              permissions: 'WRITE',
            });
          }

          // 5. Create Private Personal Vault for this user
          const personalVaultKey = await createVaultKey();
          const { data: personalVault, error: pvErr } = await supabase
            .from('vaults')
            .insert({
              owner_user_id: registeredUser.id,
              name: `Bóveda Personal (${displayName})`,
              type: 'PERSONAL',
            })
            .select()
            .single();
          if (pvErr) throw pvErr;

          const wrappedPersonalKey = await wrapVaultKeyForUser(personalVaultKey, userMasterKey);
          await supabase.from('vault_members').insert({
            vault_id: personalVault.id,
            user_id: registeredUser.id,
            encrypted_vault_key: wrappedPersonalKey.ciphertext,
            nonce: wrappedPersonalKey.nonce,
            permissions: 'ADMIN',
          });

          setIsConfigured(true);
          await decryptVaultsAndCredentials(userMasterKey, registeredUser);
        } else {
          // SIGN IN FLOW
          const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email,
            password: masterPassword,
          });
          if (authError) throw authError;
          const loggedInUser = authData.user;
          if (!loggedInUser) throw new Error('Error al iniciar sesión');

          setUser(loggedInUser);
          await fetchProfile(loggedInUser);

          // Fetch crypto record
          const { data: cryptoData, error: cryptoErr } = await supabase
            .from('user_crypto')
            .select('*')
            .eq('user_id', loggedInUser.id)
            .single();
          if (cryptoErr || !cryptoData) throw new Error('No se encontró la configuración de la bóveda');

          const userCryptoRecord: UserCryptoSetup = {
            kdfSalt: cryptoData.kdf_salt,
            kdfAlgorithm: cryptoData.kdf_algorithm,
            kdfParameters: cryptoData.kdf_parameters,
            encryptedUserKey: cryptoData.encrypted_user_key,
            userKeyNonce: cryptoData.user_key_nonce,
            cryptoVersion: cryptoData.crypto_version,
          };
          userCryptoDataRef.current = userCryptoRecord;

          // Unlock UserMasterKey with masterPassword
          const userMasterKey = await unlockUserMasterKey(masterPassword, userCryptoRecord);
          userMasterKeyRef.current = userMasterKey;

          setIsConfigured(true);
          await decryptVaultsAndCredentials(userMasterKey, loggedInUser);
        }
      } else {
        // LOCAL STANDALONE DEMO MODE
        if (isSignUp) {
          const { setup, userMasterKey } = await setupUserCrypto(masterPassword);
          userMasterKeyRef.current = userMasterKey;
          userCryptoDataRef.current = setup;

          const personalVaultKey = await createVaultKey();
          const sharedVaultKey = await createVaultKey();
          const wrappedPersonalKey = await wrapVaultKeyForUser(personalVaultKey, userMasterKey);
          const wrappedSharedKey = await wrapVaultKeyForUser(sharedVaultKey, userMasterKey);

          const personalVaultId = 'vault-personal-' + Date.now();
          const sharedVaultId = 'vault-family-pontorno';

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
              { id: sharedVaultId, name: 'Bóveda Familiar Pontorno', type: 'SHARED' },
              { id: personalVaultId, name: `Bóveda Personal (${displayName})`, type: 'PERSONAL' },
            ],
            vaultMembers: [
              {
                vaultId: sharedVaultId,
                userId: currentProfile.id,
                encryptedVaultKey: wrappedSharedKey.ciphertext,
                nonce: wrappedSharedKey.nonce,
                permissions: 'ADMIN',
              },
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
    } finally {
      setIsLoading(false);
    }
  };

  // Unlock Vault (when already authenticated but locked by timeout)
  const unlock = async (masterPassword: string) => {
    setIsLoading(true);
    try {
      const cryptoRecord = userCryptoDataRef.current;
      if (!cryptoRecord) throw new Error('No crypto configuration found');

      const userMasterKey = await unlockUserMasterKey(masterPassword, cryptoRecord);
      userMasterKeyRef.current = userMasterKey;
      await decryptVaultsAndCredentials(userMasterKey, user);
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
    setIsConfigured(false);
  };

  // Save (Add or Update) Credential
  const saveCredential = async (payload: CredentialPayload, credentialId?: string) => {
    if (!activeVaultId) throw new Error('No active vault selected');
    const vaultKey = vaultKeysRef.current.get(activeVaultId);
    if (!vaultKey) throw new Error('Vault key not available');

    const encrypted = await encryptCredential(payload, vaultKey);
    const updatedAt = new Date().toISOString();
    const currentUserName = userProfile?.displayName || 'Tú';

    let creatorInfo: CreatorInfo = {
      id: user?.id || 'local-user',
      name: `${currentUserName} (Tú)`,
      isCurrentUser: true,
    };

    if (isSupabaseConfigured && supabase && user) {
      if (credentialId) {
        const { error } = await supabase
          .from('credentials')
          .update({
            encrypted_payload: encrypted.ciphertext,
            nonce: encrypted.nonce,
            crypto_version: encrypted.cryptoVersion,
            updated_at: updatedAt,
          })
          .eq('id', credentialId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('credentials')
          .insert({
            vault_id: activeVaultId,
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
      const id = credentialId || 'cred-' + Date.now();
      credentialId = id;
      const raw = localStorage.getItem(DEMO_STORAGE_KEY);
      const db: StoredEncryptedDB = raw ? JSON.parse(raw) : { userCrypto: null, vaults: [], vaultMembers: [], credentials: [] };

      const existingIndex = db.credentials.findIndex((c) => c.id === id);
      const newEncryptedRecord = {
        id,
        vaultId: activeVaultId,
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
      localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(db));
    }

    // Update in-memory state
    setCredentials((prev) => {
      const idx = prev.findIndex((c) => c.id === credentialId);
      const item: VaultItem = {
        id: credentialId!,
        vaultId: activeVaultId,
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
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('credentials').delete().eq('id', credentialId);
      if (error) throw error;
    } else {
      const raw = localStorage.getItem(DEMO_STORAGE_KEY);
      if (raw) {
        const db: StoredEncryptedDB = JSON.parse(raw);
        db.credentials = db.credentials.filter((c) => c.id !== credentialId);
        localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(db));
      }
    }
    setCredentials((prev) => prev.filter((c) => c.id !== credentialId));
    resetActivity();
  };

  // Add Shared Vault
  const addSharedVault = async (name: string) => {
    if (!userMasterKeyRef.current) throw new Error('User not unlocked');
    const newVaultKey = await createVaultKey();
    const wrappedVaultKey = await wrapVaultKeyForUser(newVaultKey, userMasterKeyRef.current);

    if (isSupabaseConfigured && supabase && user) {
      const { data: vData, error: vError } = await supabase
        .from('vaults')
        .insert({
          owner_user_id: user.id,
          name,
          type: 'SHARED',
        })
        .select()
        .single();
      if (vError) throw vError;

      const { error: mError } = await supabase.from('vault_members').insert({
        vault_id: vData.id,
        user_id: user.id,
        encrypted_vault_key: wrappedVaultKey.ciphertext,
        nonce: wrappedVaultKey.nonce,
        permissions: 'ADMIN',
      });
      if (mError) throw mError;

      vaultKeysRef.current.set(vData.id, newVaultKey);
      const newEntity: VaultEntity = { id: vData.id, name, type: 'SHARED', permissions: 'ADMIN' };
      setVaults((prev) => [...prev, newEntity]);
      setActiveVaultId(vData.id);
    } else {
      const newVaultId = 'vault-shared-' + Date.now();
      vaultKeysRef.current.set(newVaultId, newVaultKey);

      const raw = localStorage.getItem(DEMO_STORAGE_KEY);
      const db: StoredEncryptedDB = raw ? JSON.parse(raw) : { userCrypto: null, vaults: [], vaultMembers: [], credentials: [] };

      db.vaults.push({ id: newVaultId, name, type: 'SHARED' });
      db.vaultMembers.push({
        vaultId: newVaultId,
        userId: 'current-user',
        encryptedVaultKey: wrappedVaultKey.ciphertext,
        nonce: wrappedVaultKey.nonce,
        permissions: 'ADMIN',
      });

      localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(db));
      const newEntity: VaultEntity = { id: newVaultId, name, type: 'SHARED', permissions: 'ADMIN' };
      setVaults((prev) => [...prev, newEntity]);
      setActiveVaultId(newVaultId);
    }
    resetActivity();
  };

  // Change Master Password
  const changeMasterPassword = async (oldPass: string, newPass: string) => {
    const cryptoRecord = userCryptoDataRef.current;
    if (!cryptoRecord) throw new Error('No crypto configuration found');

    const { updatedSetup, userMasterKey } = await rotateMasterPassword(oldPass, newPass, cryptoRecord);
    userMasterKeyRef.current = userMasterKey;
    userCryptoDataRef.current = updatedSetup;

    if (isSupabaseConfigured && supabase && user) {
      const { error } = await supabase
        .from('user_crypto')
        .update({
          encrypted_user_key: updatedSetup.encryptedUserKey,
          user_key_nonce: updatedSetup.userKeyNonce,
          kdf_salt: updatedSetup.kdfSalt,
          kdf_parameters: updatedSetup.kdfParameters,
          crypto_version: updatedSetup.cryptoVersion,
        })
        .eq('user_id', user.id);
      if (error) throw error;
    } else {
      const raw = localStorage.getItem(DEMO_STORAGE_KEY);
      if (raw) {
        const db: StoredEncryptedDB = JSON.parse(raw);
        db.userCrypto = updatedSetup;
        localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(db));
      }
    }
    resetActivity();
  };

  const updateDisplayName = async (newName: string) => {
    if (!newName.trim()) return;
    if (isSupabaseConfigured && supabase && user) {
      await supabase.from('profiles').upsert({
        id: user.id,
        display_name: newName.trim(),
      });
    }
    setUserProfile((prev) => prev ? { ...prev, displayName: newName.trim() } : null);
  };

  return (
    <VaultContext.Provider
      value={{
        user,
        userProfile,
        isUnlocked,
        isConfigured,
        isSupabaseConnected: isSupabaseConfigured,
        activeVaultId,
        vaults,
        credentials,
        isLoading,
        autoLockMinutes,
        timeRemainingSeconds,
        setActiveVaultId,
        setAutoLockMinutes: setAutoLockMinutesState,
        unifiedAuth,
        signOut,
        unlock,
        lock,
        saveCredential,
        removeCredential,
        addSharedVault,
        changeMasterPassword,
        updateDisplayName,
      }}
    >
      {children}
    </VaultContext.Provider>
  );
}

export function useVault() {
  const context = useContext(VaultContext);
  if (!context) {
    throw new Error('useVault must be used within a VaultProvider');
  }
  return context;
}
