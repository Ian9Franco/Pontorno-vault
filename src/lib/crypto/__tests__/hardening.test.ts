import { describe, expect, it } from 'vitest';
import {
  createVaultKey,
  decryptAES_GCM,
  decryptCredential,
  encryptAES_GCM,
  encryptCredential,
  setupUserCrypto,
  unlockUserMasterKey,
} from '..';

const payload = {
  platform: 'Example',
  username: 'ian@example.test',
  password: 'correct horse battery staple',
  url: 'https://example.test',
  notes: 'test',
};

describe('crypto hardening', () => {
  it('authenticates AES-GCM additional data', async () => {
    const key = await createVaultKey();
    const aad = new TextEncoder().encode('context-a');
    const encrypted = await encryptAES_GCM('secret', key, undefined, aad, 2);
    await expect(decryptAES_GCM(encrypted, key, aad)).resolves.toBeInstanceOf(Uint8Array);
    await expect(decryptAES_GCM(encrypted, key, new TextEncoder().encode('context-b'))).rejects.toThrow();
  });

  it('writes credential v2 with AAD and reads legacy v1', async () => {
    const key = await createVaultKey();
    const hardened = await crypto.subtle.importKey(
      'raw',
      await crypto.subtle.exportKey('raw', key),
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt'],
    );

    const current = await encryptCredential(payload, hardened);
    expect(current.cryptoVersion).toBe(2);
    await expect(decryptCredential(current, hardened)).resolves.toEqual(payload);

    const legacy = await encryptAES_GCM(JSON.stringify(payload), hardened);
    expect(legacy.cryptoVersion).toBe(1);
    await expect(decryptCredential(legacy, hardened)).resolves.toEqual(payload);
  });

  it('keeps the runtime user master key non-extractable', async () => {
    const { setup, userMasterKey } = await setupUserCrypto('a very long master phrase for tests');
    expect(userMasterKey.extractable).toBe(false);

    const unlocked = await unlockUserMasterKey('a very long master phrase for tests', setup);
    expect(unlocked.extractable).toBe(false);
  });
});
