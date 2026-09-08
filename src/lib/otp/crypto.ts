import { base64ToBuffer, bufferToBase64, cryptoContext, encryptAES_GCM, decryptAES_GCM } from '../crypto';
import type { OtpContext, OtpEnvelope, OtpKey } from './types';

const bytes = (value: Uint8Array) => value as unknown as BufferSource;
function aad(context: OtpContext) {
  // Normalize timestamps: Postgres may return a different textual timezone representation.
  return cryptoContext('otp:v1', context.id, context.vault_id, context.credential_id, context.key_id, context.kind, new Date(context.expires_at).toISOString());
}
export function assertPublicReceivingKey(key: JsonWebKey) {
  if (key.kty !== 'RSA' || key.e !== 'AQAB' || !key.n || base64ToBuffer(key.n.replace(/-/g,'+').replace(/_/g,'/')).length !== 384 ||
    ['d','p','q','dp','dq','qi','oth'].some(part => part in key)) throw new Error('La clave pública de recepción no es válida.');
}
export async function createReceivingKey(vaultId: string, vaultKey: CryptoKey): Promise<OtpKey> {
  const id = crypto.randomUUID();
  const pair = await crypto.subtle.generateKey({ name: 'RSA-OAEP', modulusLength: 3072, publicExponent: new Uint8Array([1,0,1]), hash: 'SHA-256' }, true, ['wrapKey','unwrapKey']);
  const raw = new Uint8Array(await crypto.subtle.exportKey('pkcs8', pair.privateKey));
  try {
    const encrypted = await encryptAES_GCM(raw, vaultKey, undefined, cryptoContext('otp-private:v1',vaultId,id));
    return { id, vault_id: vaultId, public_key: await crypto.subtle.exportKey('jwk', pair.publicKey), encrypted_private_key: encrypted.ciphertext, nonce: encrypted.nonce };
  } finally { raw.fill(0); }
}
export async function encryptOtp(code: string, context: OtpContext, publicKey: JsonWebKey): Promise<OtpEnvelope> {
  assertPublicReceivingKey(publicKey);
  const recipient = await crypto.subtle.importKey('jwk',publicKey,{name:'RSA-OAEP',hash:'SHA-256'},false,['wrapKey']);
  const key = await crypto.subtle.generateKey({name:'AES-GCM',length:256},true,['encrypt','decrypt']);
  const encrypted = await encryptAES_GCM(code,key,undefined,aad(context));
  const wrapped = await crypto.subtle.wrapKey('raw',key,recipient,{name:'RSA-OAEP'});
  return { version:1, ciphertext:encrypted.ciphertext,nonce:encrypted.nonce,wrappedKey:bufferToBase64(wrapped) };
}
export async function decryptOtp(envelope: OtpEnvelope, context: OtpContext, record: OtpKey, vaultKey: CryptoKey) {
  if (envelope.version!==1 || record.id!==context.key_id || record.vault_id!==context.vault_id || Date.parse(context.expires_at)<=Date.now()) throw new Error('El código venció o no pertenece a esta bóveda.');
  const raw = await decryptAES_GCM({ciphertext:record.encrypted_private_key,nonce:record.nonce,cryptoVersion:1},vaultKey,cryptoContext('otp-private:v1',record.vault_id,record.id));
  try {
    const privateKey = await crypto.subtle.importKey('pkcs8',bytes(raw),{name:'RSA-OAEP',hash:'SHA-256'},false,['unwrapKey']);
    const key = await crypto.subtle.unwrapKey('raw',bytes(base64ToBuffer(envelope.wrappedKey)),privateKey,{name:'RSA-OAEP'},{name:'AES-GCM',length:256},false,['decrypt']);
    const plaintext = await decryptAES_GCM({ciphertext:envelope.ciphertext,nonce:envelope.nonce,cryptoVersion:1},key,aad(context));
    try {
      const code = new TextDecoder().decode(plaintext);
      if (!/^[A-Z0-9]{4,12}$/.test(code)) throw new Error('El código recibido no es válido.');
      return code;
    } finally { plaintext.fill(0); }
  } finally { raw.fill(0); }
}
