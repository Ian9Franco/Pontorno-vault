import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { AuthModal } from '../AuthModal';
const state = { isSupabaseConnected: false, isConfigured: false, isLoading: false };
vi.mock('@/context/VaultContext', () => ({ useVault: () => state }));
describe('onboarding access modes', () => {
  it('guides a fresh local browser to create a vault without an email', () => {
    const html = renderToStaticMarkup(<AuthModal />);
    expect(html).toContain('Crear mi bóveda');
    expect(html).toContain('access-confirm');
    expect(html).not.toContain('type="email"');
    expect(html).toContain('Solo en este navegador');
  });
  it('asks only for the master password when a local vault already exists', () => {
    state.isConfigured = true;
    const html = renderToStaticMarkup(<AuthModal />);
    expect(html).toContain('Abrir mi bóveda');
    expect(html).not.toContain('access-confirm');
    expect(html).not.toContain('Crear mi bóveda');
    expect(html).not.toContain('type="email"');
  });
  it('keeps account sign-in available for connected mode', () => {
    state.isSupabaseConnected = true;
    const html = renderToStaticMarkup(<AuthModal />);
    expect(html).toContain('type="email"');
    expect(html).toContain('Crear cuenta');
    expect(html).not.toContain('Solo en este navegador');
  });
});
