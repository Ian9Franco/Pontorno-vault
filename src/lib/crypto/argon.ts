import { argon2id } from 'hash-wasm';
import { ArgonParameters } from './types';
import { base64ToBuffer, bufferToBase64 } from './serialization';

/**
 * Recommended default parameters for client-side Argon2id:
 * - timeCost: 3 iterations
 * - memoryCost: 65536 KiB (64 MB)
 * - parallelism: 4 lanes
 * - hashLength: 32 bytes (256 bits for AES-256)
 */
export const DEFAULT_ARGON_PARAMS: ArgonParameters = {
  timeCost: 3,
  memoryCost: 65536,
  parallelism: 4,
  hashLength: 32,
};

/**
 * Generates a cryptographically random salt (default 16 bytes).
 */
export function generateSalt(byteLength = 16): Uint8Array {
  const salt = new Uint8Array(byteLength);
  crypto.getRandomValues(salt);
  return salt;
}

/**
 * Derives a 256-bit Key Encryption Key (KEK) as raw bytes from a master password and salt.
 * Uses Argon2id compiled to WebAssembly via `hash-wasm`.
 */
export async function deriveKEKBytes(
  masterPassword: string,
  salt: Uint8Array | string,
  params: ArgonParameters = DEFAULT_ARGON_PARAMS
): Promise<Uint8Array> {
  const saltBytes = typeof salt === 'string' ? base64ToBuffer(salt) : salt;

  const rawKey = await argon2id({
    password: masterPassword,
    salt: saltBytes,
    iterations: params.timeCost,
    memorySize: params.memoryCost,
    parallelism: params.parallelism,
    hashLength: params.hashLength,
    outputType: 'binary',
  });

  return rawKey;
}

/**
 * Derives a CryptoKey (for AES-GCM wrapping/unwrapping) from a master password.
 */
export async function deriveKEK(
  masterPassword: string,
  salt: Uint8Array | string,
  params: ArgonParameters = DEFAULT_ARGON_PARAMS
): Promise<CryptoKey> {
  const rawKey = await deriveKEKBytes(masterPassword, salt, params);

  return await crypto.subtle.importKey(
    'raw',
    rawKey as unknown as BufferSource,
    { name: 'AES-GCM', length: 256 },
    false, // not extractable
    ['wrapKey', 'unwrapKey', 'encrypt', 'decrypt']
  );
}
