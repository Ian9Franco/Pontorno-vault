import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { VaultView } from '../VaultView';
import { CreateVaultModal } from '../CreateVaultModal';
import { EditVaultModal } from '../EditVaultModal';
import { UnlockModal } from '../UnlockModal';
import type { VaultEntity } from '@/context/VaultContext';

const state = {
  userProfile: { displayName: 'Test', email: 'test@example.invalid' },
  user: null, isSupabaseConnected: true, isLoading: false, accessError: null as string | null,
  activeVaultId: 'vault', vaults: [] as VaultEntity[],
  credentials: [{ id: 'credential', vaultId: 'vault', payload: {
    platform: 'Test', username: 'test', password: 'fake-password', url: '', notes: '',
  }, updatedAt: '2026-09-07T00:00:00Z' }],
};
vi.mock('@/context/VaultContext', () => ({ useVault: () => state }));
vi.mock('@/lib/supabase/client', () => ({ isSupabaseConfigured: true, supabase: null }));

describe('permission-aware vault UI', () => {
  it.each(['READ', 'WRITE', 'ADMIN'] as const)('renders %s without granting ownership', (permissions) => {
    state.vaults = [{ id: 'vault', name: 'Shared', type: 'SHARED', permissions, isOwner: false }];
    const html = renderToStaticMarkup(<VaultView onAddCredential={() => {}} onEditCredential={() => {}} />);
    expect(html.includes('Añadir Credencial')).toBe(permissions !== 'READ');
    expect(html.includes('title="Editar"')).toBe(permissions !== 'READ');
    expect(html.includes('title="Eliminar"')).toBe(permissions !== 'READ');
    expect(html).not.toContain('title="Editar Bóveda"');
    expect(html).not.toContain('Editar bóveda actual');
    expect(html).toContain('Copiar contraseña');
    expect(html).toContain('invitaciones aún no están disponibles');
    expect(html).toContain('Solo para esta bóveda. Se descifran en tu dispositivo.');
    expect(html).not.toContain('Recibir códigos');
    expect(html).not.toContain('Configurar reenvío');
  });
  it('shows management only to the owner and protects the edit modal too', () => {
    const vault: VaultEntity = { id: 'vault', name: 'Shared', type: 'SHARED', permissions: 'ADMIN', isOwner: true };
    state.vaults = [vault];
    expect(renderToStaticMarkup(<VaultView onAddCredential={() => {}} onEditCredential={() => {}} />)).toContain('Editar bóveda actual');
    expect(renderToStaticMarkup(<EditVaultModal isOpen onClose={() => {}} vault={{ ...vault, isOwner: false }} />)).toBe('');
  });
  it('explains sharing at creation and preserves access errors in the unlock dialog', () => {
    expect(renderToStaticMarkup(<CreateVaultModal isOpen onClose={() => {}} />)).toContain('Al crearla, solo tú tendrás acceso');
    state.accessError = 'No se pudo conectar con el servidor.';
    const html = renderToStaticMarkup(<UnlockModal />);
    expect(html).toContain('role="alert"');
    expect(html).toContain(state.accessError);
    state.accessError = null;
  });
});
