import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { VaultItem, VaultEntity } from '@/context/VaultContext';
import { CredentialLibrary, filterCredentials } from '../vault/CredentialLibrary';
import { VaultSelector } from '../vault/VaultSelector';

vi.mock('@/lib/supabase/client', () => ({ isSupabaseConfigured: false, supabase: null }));
const items: VaultItem[] = Array.from({ length: 25 }, (_, index) => ({
  id: `item-${index}`, vaultId: 'personal', updatedAt: '2026-09-07T00:00:00Z',
  payload: { platform: `Servicio ${index + 1}`, username: `usuario-${index}`, password: 'Never-render-this-secret', url: '', notes: '' },
}));

describe('bounded credential library', () => {
  it('renders at most twelve records and exposes navigation without rendering secrets', () => {
    const html = renderToStaticMarkup(<CredentialLibrary items={items} canWrite onAdd={() => {}} onEdit={() => {}} onRemove={async () => {}} />);
    expect(html.match(/<article /g)).toHaveLength(12);
    expect(html).toContain('Página siguiente');
    expect(html).toContain('de 25');
    expect(html).not.toContain('Never-render-this-secret');
  });
  it('searches the full collection before pagination and excludes passwords', () => {
    expect(filterCredentials(items, '  SERVICIO 25 ')).toEqual([items[24]]);
    expect(filterCredentials(items, 'Never-render-this-secret')).toHaveLength(0);
  });
  it('uses direct buttons for both vaults and exposes the active state', () => {
    const vaults: VaultEntity[] = [
      { id: 'personal', name: 'Personal', type: 'PERSONAL', isOwner: true, permissions: 'ADMIN' },
      { id: 'shared', name: 'Familiar', type: 'SHARED', isOwner: false, permissions: 'READ' },
    ];
    const html = renderToStaticMarkup(<VaultSelector vaults={vaults} credentials={items} activeId="shared" onSelect={() => {}} />);
    expect(html).not.toContain('<select');
    expect(html.match(/<button /g)).toHaveLength(2);
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('25 servicios');
  });
});
