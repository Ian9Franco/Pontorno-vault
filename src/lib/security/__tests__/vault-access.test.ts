import { describe, expect, it } from 'vitest';
import { assertMutationSucceeded, canManageVault, canWriteCredentials, vaultErrorMessage } from '../vault-access';

describe('access and mutation feedback', () => {
  it('separates credential permissions from vault ownership', () => {
    expect(canWriteCredentials({ permissions: 'READ' })).toBe(false);
    expect(canWriteCredentials({ permissions: 'WRITE' })).toBe(true);
    expect(canWriteCredentials({ permissions: 'ADMIN' })).toBe(true);
    expect(canManageVault({ isOwner: false })).toBe(false);
    expect(canManageVault({ isOwner: true })).toBe(true);
    expect(canManageVault()).toBe(false);
  });
  it('rejects a successful HTTP mutation when no row changed', () => {
    expect(() => assertMutationSucceeded({ data: null, error: null })).toThrow('No se aplicó');
    expect(() => assertMutationSucceeded({ data: null, error: { code: '42501' } })).toThrow();
    expect(() => assertMutationSucceeded({ data: { id: 'changed' }, error: null })).not.toThrow();
  });
  it('distinguishes network, denied access, password and existing-vault key errors', () => {
    expect(vaultErrorMessage(new TypeError('Failed to fetch'))).toContain('conexión');
    expect(vaultErrorMessage({ code: '42501', message: 'permission denied' })).toContain('permiso');
    expect(vaultErrorMessage(new DOMException('', 'OperationError'))).toContain('contraseña maestra');
    expect(vaultErrorMessage(new Error('No se pudo abrir la clave de una bóveda existente.'))).toContain('bóveda existente');
    expect(vaultErrorMessage({ message: 'secret database internals' })).not.toContain('internals');
  });
});
