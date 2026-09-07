import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthModal } from '../AuthModal';

const state = { isSupabaseConnected: false, isConfigured: false, isLoading: false };
vi.mock('@/context/VaultContext', () => ({ useVault: () => state }));

afterEach(() => {
  state.isSupabaseConnected = false;
  state.isConfigured = false;
  state.isLoading = false;
});

describe('onboarding access modes', () => {
  it('guides a fresh local browser to create a vault without an email', () => {
    const html = renderToStaticMarkup(<AuthModal />);
    expect(html).toContain('Crear mi bóveda');
    expect(html).toContain('local-confirm');
    expect(html).not.toContain('type="email"');
    expect(html).toContain('Solo en este navegador');
  });

  it('asks only for the vault secret when a local vault already exists', () => {
    state.isConfigured = true;
    const html = renderToStaticMarkup(<AuthModal />);
    expect(html).toContain('Abrir mi bóveda');
    expect(html).not.toContain('local-confirm');
    expect(html).not.toContain('Crear mi bóveda');
    expect(html).not.toContain('type="email"');
  });

  it('uses Google as the primary identity provider in connected mode', () => {
    state.isSupabaseConnected = true;
    const html = renderToStaticMarkup(<AuthModal />);
    expect(html).toContain('Continuar con Google');
    expect(html).toContain('Identidad separada del cifrado');
    expect(html).toContain('Acceso legado');
    expect(html).not.toContain('type="email"');
    expect(html).not.toContain('Crear cuenta');
    expect(html).not.toContain('Solo en este navegador');
  });
});
