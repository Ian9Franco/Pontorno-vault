'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { type UserCryptoSetup } from '@/lib/crypto';
import {
  TEST_MASTER_DISPLAY_NAME,
  TEST_MASTER_EMAIL,
  TEST_MASTER_USER_ID,
  isTestMasterSession,
} from '@/lib/constants/test-master';
import { isSupabaseConfigured, supabase } from '@/lib/supabase/client';
import { type User } from '@supabase/supabase-js';
import { DEMO_STORAGE_KEY, type StoredEncryptedDB, type VaultEntity, type VaultItem, type UserProfile } from './types';

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

/** Owns session state, subscriptions and inactivity locking. Keys stay in memory. */
export function useVaultSession() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [accessError, setAccessError] = useState<string | null>(null);
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
        userCryptoDataRef.current = null;
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
        if (isTestMasterSession()) {
          setUser(createTestMasterUser());
          await checkUserCryptoStatus(null);
        } else if (isSupabaseConfigured && supabase) {
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

    if (!isTestMasterSession() && isSupabaseConfigured && supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        const currentUser = session?.user || null;
        setUser(currentUser);
        if (event === 'SIGNED_OUT' || !currentUser) {
          lock();
          setUserProfile(null);
          userCryptoDataRef.current = null;
          setIsConfigured(false);
        } else if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
          await fetchProfile(currentUser);
          await checkUserCryptoStatus(currentUser);
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

  return { user, setUser, userProfile, setUserProfile, accessError, setAccessError, isUnlocked, setIsUnlocked, isConfigured, setIsConfigured, activeVaultId, setActiveVaultId, vaults, setVaults, credentials, setCredentials, isLoading, setIsLoading, autoLockMinutes, setAutoLockMinutesState, timeRemainingSeconds, setTimeRemainingSeconds, userMasterKeyRef, vaultKeysRef, userCryptoDataRef, lock, fetchProfile, resetActivity };
}
export type VaultSession = ReturnType<typeof useVaultSession>;
