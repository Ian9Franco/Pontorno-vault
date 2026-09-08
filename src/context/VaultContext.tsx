'use client';
import React, { createContext, useContext } from 'react';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { isTestMasterUser } from '@/lib/constants/test-master';
import type { VaultContextType } from './vault/types';
import { useVaultSession } from './vault/useVaultSession';
import { useVaultDecryption } from './vault/useVaultDecryption';
import { createAuthActions } from './vault/createAuthActions';
import { createMutationActions } from './vault/createMutationActions';
import { createOtpActions } from './vault/createOtpActions';
export type { CreatorInfo, VaultItem, VaultEntity, UserProfile } from './vault/types';

const VaultContext = createContext<VaultContextType | null>(null);
/** Composition boundary: keys remain private; consumers receive the public API. */
export function VaultProvider({ children }: { children: React.ReactNode }) {
  const session = useVaultSession();
  const decrypt = useVaultDecryption(session);
  const auth = createAuthActions(session, decrypt);
  const mutations = createMutationActions(session);
  const otp = createOtpActions(session);
  const { user, userProfile, isUnlocked, isConfigured, activeVaultId, vaults, credentials,
    isLoading, accessError, autoLockMinutes, timeRemainingSeconds, setActiveVaultId, lock } = session;
  return <VaultContext.Provider value={{
    user, userProfile, isUnlocked, isConfigured, activeVaultId, vaults, credentials,
    isLoading, accessError, autoLockMinutes, timeRemainingSeconds, setActiveVaultId, lock,
    isSupabaseConnected: isSupabaseConfigured && !isTestMasterUser(user), setAutoLockMinutes: session.setAutoLockMinutesState,
    ...auth, ...mutations, ...otp,
  }}>{children}</VaultContext.Provider>;
}
export function useVault() {
  const context = useContext(VaultContext);
  if (!context) throw new Error('useVault must be used within a VaultProvider');
  return context;
}
