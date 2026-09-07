import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createVaultKey, unwrapVaultKey, wrapVaultKeyForUser } from '../../crypto';
import { createOwnedVault, loadOwnedVaults } from '../vault-persistence';

function mockClient(data: unknown, error: unknown = null) {
  const eq = vi.fn().mockResolvedValue({ data, error });
  const from = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ eq }) });
  const rpc = vi.fn().mockResolvedValue({ data: 'new-vault', error: null });
  return { client: { from, rpc } as unknown as SupabaseClient, from, rpc, eq };
}

describe('vault persistence', () => {
  it('sends only an encrypted wrapper and creates its matching client key', async () => {
    const master = await createVaultKey();
    const { client, rpc, from } = mockClient([]);
    const created = await createOwnedVault(client, master, 'Shared', 'SHARED');
    const args = rpc.mock.calls[0][1];
    expect(Object.keys(args).sort()).toEqual(['p_encrypted_vault_key', 'p_name', 'p_nonce', 'p_type']);
    const recovered = await unwrapVaultKey(args.p_encrypted_vault_key, args.p_nonce, master);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const plaintext = new TextEncoder().encode('same vault key');
    const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, created.key, plaintext);
    expect(new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, recovered, cipher)))
      .toEqual(plaintext);
    expect(from).not.toHaveBeenCalled();
  });

  it('does not create on fetch errors, missing data, missing vaults, or corrupt wrappers', async () => {
    const master = await createVaultKey();
    const wrapped = await wrapVaultKeyForUser(await createVaultKey(), await createVaultKey());
    for (const [data, error] of [
      [null, new Error('network')], [null, null],
      [[{ vaults: null }], null],
      [[{ vaults: { id: 'existing', name: 'Shared', type: 'SHARED', owner_user_id: 'user-A' },
        encrypted_vault_key: wrapped.ciphertext, nonce: wrapped.nonce, permissions: 'READ' }], null],
    ]) {
      const mock = mockClient(data, error);
      await expect(loadOwnedVaults(mock.client, master, 'user-B')).rejects.toBeDefined();
      expect(mock.rpc).not.toHaveBeenCalled();
    }
  });

  it('loads existing shared keys without replacing or enrolling memberships', async () => {
    const master = await createVaultKey();
    const wrapped = await wrapVaultKeyForUser(await createVaultKey(), master);
    const mock = mockClient([{ vaults: { id: 'existing', name: 'Shared', type: 'SHARED', owner_user_id: 'user-A' },
      encrypted_vault_key: wrapped.ciphertext, nonce: wrapped.nonce, permissions: 'READ' }]);
    expect(await loadOwnedVaults(mock.client, master, 'user-B')).toMatchObject([{ id: 'existing', permissions: 'READ', isOwner: false }]);
    expect(await loadOwnedVaults(mock.client, master, 'user-A')).toMatchObject([{ isOwner: true }]);
    expect(mock.eq).toHaveBeenCalledWith('user_id', 'user-B');
    expect(mock.rpc).not.toHaveBeenCalled();
  });

  it('creates only a personal vault for an empty account and propagates RPC failures', async () => {
    const master = await createVaultKey();
    const mock = mockClient([]);
    expect(await loadOwnedVaults(mock.client, master, 'user-B')).toMatchObject([{ id: 'new-vault', type: 'PERSONAL' }]);
    expect(mock.rpc).toHaveBeenCalledTimes(1);
    mock.rpc.mockResolvedValue({ data: null, error: { message: 'denied' } });
    await expect(createOwnedVault(mock.client, master, 'Shared', 'SHARED')).rejects.toMatchObject({ message: 'denied' });
  });
});
