import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { VaultEntity } from '@/context/VaultContext';
import { EditVaultModal } from '../EditVaultModal';
import { ManageVaultsModal } from '../vault/ManageVaultsModal';
import { VaultLoading } from '../vault/VaultLoading';

const owner: VaultEntity = { id: 'own', name: 'Personal', type: 'PERSONAL', permissions: 'ADMIN', isOwner: true };
const shared: VaultEntity = { id: 'shared', name: 'Familiar', type: 'SHARED', permissions: 'READ', isOwner: false };
const state = { vaults: [owner, shared], credentials: [], activeVaultId: 'own' };
vi.mock('@/context/VaultContext', () => ({ useVault: () => state }));

describe('vault action boundaries', () => {
  it('editing the active vault does not offer deletion', () => {
    const html = renderToStaticMarkup(<EditVaultModal isOpen vault={owner} onClose={() => {}} />);
    expect(html).toContain('Editar bóveda actual');
    expect(html).toContain('Guardar cambios');
    expect(html).not.toContain('Eliminar');
    expect(html).toContain('value="Personal"');
  });
  it('management offers creation and deletion only for owned vaults', () => {
    const html = renderToStaticMarkup(<ManageVaultsModal onClose={() => {}} onCreate={() => {}} />);
    expect(html).toContain('Crear nueva bóveda');
    expect(html).toContain('Eliminar Personal');
    expect(html).not.toContain('Eliminar Familiar');
  });
  it('protects the last remaining vault', () => {
    state.vaults = [owner];
    const html = renderToStaticMarkup(<ManageVaultsModal onClose={() => {}} onCreate={() => {}} />);
    expect(html).toContain('Debes conservar al menos una bóveda');
    expect(html).toMatch(/<button disabled=""[^>]*aria-label="Eliminar Personal"/);
    state.vaults = [owner, shared];
  });
  it('loading announces the real stage and keeps decorative placeholders out of accessibility text', () => {
    const html = renderToStaticMarkup(<VaultLoading unlocking />);
    expect(html).toContain('role="status"');
    expect(html).toContain('Abriendo tu bóveda');
    expect(html).toContain('vault-skeleton" aria-hidden="true"');
    expect(html).not.toContain('%');
  });
});
