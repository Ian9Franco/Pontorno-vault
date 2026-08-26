/**
 * Serialization helpers for ArrayBuffers, Uint8Arrays, Strings and Base64.
 * Universal support for Browser Web Crypto and Node.js environments.
 */

/**
 * Converts a Uint8Array or ArrayBuffer to a Base64 string.
 */
export function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  if (typeof globalThis !== 'undefined' && (globalThis as unknown as { Buffer?: typeof Buffer }).Buffer) {
    return (globalThis as unknown as { Buffer: typeof Buffer }).Buffer.from(bytes).toString('base64');
  }
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Converts a Base64 string to a Uint8Array.
 */
export function base64ToBuffer(base64: string): Uint8Array {
  if (typeof globalThis !== 'undefined' && (globalThis as unknown as { Buffer?: typeof Buffer }).Buffer) {
    return new Uint8Array((globalThis as unknown as { Buffer: typeof Buffer }).Buffer.from(base64, 'base64'));
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Converts a UTF-8 string to a Uint8Array.
 */
export function stringToBuffer(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

/**
 * Converts a Uint8Array / ArrayBuffer to a UTF-8 string.
 */
export function bufferToString(buffer: ArrayBuffer | Uint8Array): string {
  return new TextDecoder().decode(buffer);
}

/**
 * Converts a Uint8Array or ArrayBuffer to a Hex string.
 */
export function bufferToHex(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Converts a Hex string to a Uint8Array.
 */
export function hexToBuffer(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}
