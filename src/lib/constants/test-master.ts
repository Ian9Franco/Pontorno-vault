import type { User } from '@supabase/supabase-js';
export const TEST_MASTER_EMAIL = 'master@pontorno-vault.test';
export const TEST_MASTER_PASSWORD = 'VaultMaster-Test-2026!';
export const TEST_MASTER_DISPLAY_NAME = 'Vault Master';
export const TEST_MASTER_USER_ID = '00000000-0000-4000-8000-000000000001';
export const TEST_MASTER_SESSION_KEY = 'pontorno_vault_test_master_session_v1';
export const TEST_MASTER_STORAGE_KEY = 'pontorno_vault_test_master_store_v2';

export function createTestMasterUser(): User {
  return { id: TEST_MASTER_USER_ID, aud: 'authenticated', role: 'authenticated',
    email: TEST_MASTER_EMAIL, app_metadata: { provider: 'test-master', providers: ['test-master'] },
    user_metadata: { display_name: TEST_MASTER_DISPLAY_NAME, test_master: true },
    created_at: new Date(0).toISOString() } as User;
}

export function isTestMasterUser(user: User | null): boolean {
  return user?.id === TEST_MASTER_USER_ID && user.app_metadata?.provider === 'test-master';
}

export function localVaultStorageKey(fallback: string, user: User | null = null): string {
  return isTestMasterSession() || isTestMasterUser(user) ? TEST_MASTER_STORAGE_KEY : fallback;
}

/**
 * Public, disposable test credentials. They intentionally unlock only the local
 * encrypted sandbox and never authenticate against Supabase or grant access to
 * production/shared data.
 */
export function isTestMasterCredentials(email: string, password: string): boolean {
  return email.trim().toLowerCase() === TEST_MASTER_EMAIL && password === TEST_MASTER_PASSWORD;
}

export function isTestMasterSession(): boolean {
  return typeof window !== 'undefined' && localStorage.getItem(TEST_MASTER_SESSION_KEY) === '1';
}
