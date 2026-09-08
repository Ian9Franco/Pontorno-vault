import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { createAuthActions } from '../createAuthActions';
import { createMutationActions } from '../createMutationActions';
import { createOtpActions } from '../createOtpActions';
import { createSessionGuard } from '@/lib/security/session-guard';
import { TEST_MASTER_EMAIL, TEST_MASTER_PASSWORD, TEST_MASTER_STORAGE_KEY, TEST_MASTER_SESSION_KEY } from '@/lib/constants/test-master';
import { DEMO_STORAGE_KEY, type StoredEncryptedDB } from '../types';
import type { VaultSession } from '../useVaultSession';
import { decryptCredential, unwrapVaultKey } from '@/lib/crypto';

const remote = vi.hoisted(() => ({ from: vi.fn(() => { throw new Error('Unexpected remote database access'); }),
  rpc: vi.fn(() => { throw new Error('Unexpected remote RPC'); }),
  auth: { signInWithPassword: vi.fn(() => { throw new Error('Unexpected remote login'); }), signOut: vi.fn() } }));
vi.mock('@/lib/supabase/client', () => ({ isSupabaseConfigured: true, supabase: remote }));

function fixture() {
  const guard = createSessionGuard();
  const state: Record<string, any> = { guard, authBusyRef: { current: false }, user: null, userProfile: null,
    userMasterKeyRef: { current: null }, userCryptoDataRef: { current: null }, vaultKeysRef: { current: new Map() },
    isUnlocked: false, vaults: [], credentials: [], activeVaultId: null, resetActivity: vi.fn() };
  for (const name of ['User','UserProfile','AccessError','IsConfigured','IsLoading','Credentials','Vaults','ActiveVaultId']) {
    const key = name[0].toLowerCase()+name.slice(1);
    state['set'+name] = (value: any) => { state[key] = typeof value === 'function' ? value(state[key]) : value; };
  }
  state.lock = () => { guard.invalidate(); state.isUnlocked = false; state.userMasterKeyRef.current = null; state.vaultKeysRef.current.clear(); };
  const session = state as VaultSession;
  const decrypt = async (key: CryptoKey, _user: unknown, ticket: number) => {
    const db: StoredEncryptedDB = JSON.parse(localStorage.getItem(TEST_MASTER_STORAGE_KEY)!);
    for (const member of db.vaultMembers) {
      const vaultKey = await unwrapVaultKey(member.encryptedVaultKey, member.nonce, key,
        { vaultId: member.vaultId, userId: member.userId, cryptoVersion: member.cryptoVersion || 1 });
      guard.assert(ticket); session.vaultKeysRef.current.set(member.vaultId, vaultKey);
    }
    session.vaults = db.vaults.map(v => ({ ...v, permissions: 'ADMIN', isOwner: true }));
    session.activeVaultId = db.vaults[0].id; session.isUnlocked = true;
  };
  return { session, auth: () => createAuthActions(session, decrypt) };
}

describe('public test master isolation with Supabase configured', () => {
  beforeEach(() => {
    const data = new Map<string,string>();
    vi.stubGlobal('window', {});
    vi.stubGlobal('localStorage', { getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string,v: string) => data.set(k,v), removeItem: (k: string) => data.delete(k) });
    localStorage.setItem(DEMO_STORAGE_KEY, 'existing personal demo');
  });
  afterEach(() => vi.unstubAllGlobals());

  it('creates, edits, locks and reopens only its separate encrypted sandbox', async () => {
    const { session, auth } = fixture();
    await auth().unifiedAuth({ email: TEST_MASTER_EMAIL, masterPassword: TEST_MASTER_PASSWORD, isSignUp: false });
    expect(session.isUnlocked).toBe(true);
    const mutations = createMutationActions(session);
    const payload = { platform: 'Netflix', username: 'test@example.test', password: 'Disposable123!', notes: '' };
    await mutations.saveCredential(payload);
    await createMutationActions(session).updateDisplayName('Tester');
    const db: StoredEncryptedDB = JSON.parse(localStorage.getItem(TEST_MASTER_STORAGE_KEY)!);
    expect(db.profile?.displayName).toBe('Tester');
    expect(db.credentials).toHaveLength(1);
    expect(JSON.stringify(db)).not.toContain(payload.password);
    const record = db.credentials[0];
    await expect(decryptCredential({ ciphertext: record.encryptedPayload, nonce: record.nonce, cryptoVersion: record.cryptoVersion },
      session.vaultKeysRef.current.get(record.vaultId)!, { vaultId: record.vaultId, credentialId: record.id })).resolves.toMatchObject(payload);
    await expect(mutations.changeMasterPassword(TEST_MASTER_PASSWORD, 'another long phrase')).rejects.toThrow('fija');
    await expect(createOtpActions(session).loadOtpInbox(record.vaultId)).rejects.toThrow('sandbox');
    session.lock();
    await expect(auth().unlock('incorrect password')).rejects.toThrow();
    expect(session.isUnlocked).toBe(false);
    await auth().unlock(TEST_MASTER_PASSWORD);
    expect(session.isUnlocked).toBe(true);
    await auth().signOut();
    expect(localStorage.getItem(TEST_MASTER_SESSION_KEY)).toBeNull();
    expect(localStorage.getItem(DEMO_STORAGE_KEY)).toBe('existing personal demo');
    expect(remote.from).not.toHaveBeenCalled(); expect(remote.rpc).not.toHaveBeenCalled();
    expect(remote.auth.signInWithPassword).not.toHaveBeenCalled(); expect(remote.auth.signOut).not.toHaveBeenCalled();
  });

  it('does not publish a sandbox if locking interrupts key derivation', async () => {
    const { session, auth } = fixture();
    const pending = auth().unifiedAuth({ email: TEST_MASTER_EMAIL, masterPassword: TEST_MASTER_PASSWORD, isSignUp: false });
    session.lock();
    await expect(pending).rejects.toThrow();
    expect(session.isUnlocked).toBe(false);
    expect(session.userMasterKeyRef.current).toBeNull();
    expect(localStorage.getItem(TEST_MASTER_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(DEMO_STORAGE_KEY)).toBe('existing personal demo');
  });
});
