export interface OtpAlias {
  id: string; vault_id: string; credential_id: string; key_id: string; address_token: string;
  service_key: string; status: 'setup' | 'active' | 'paused'; setup_until: string;
  last_received_at: string | null; last_status: string | null;
}
export interface OtpContext {
  id: string; vault_id: string; credential_id: string; key_id: string; kind: 'otp' | 'setup'; expires_at: string;
}
export interface OtpEnvelope { version: 1; ciphertext: string; nonce: string; wrappedKey: string }
export interface OtpCode extends OtpContext { created_at: string; envelope: OtpEnvelope }
export interface OtpKey { id: string; vault_id: string; public_key: JsonWebKey; encrypted_private_key: string; nonce: string }
export interface OtpSnapshot { aliases: OtpAlias[]; codes: Array<OtpContext & { code: string; created_at: string }>; }
export interface OtpConfig { enabled: boolean; domain: string | null; }
