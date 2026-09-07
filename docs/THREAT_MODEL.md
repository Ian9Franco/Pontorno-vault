# Threat Model

## Security objective

The objective is not "unhackable". The objective is **compromise isolation**: a failure of one provider or one storage layer should not automatically reveal credential plaintext.

## Trust boundaries

```text
Google / passkey
      |
      v
Supabase Auth --------> RLS / ciphertext database

independent vault secret
      |
      v
Argon2id -> KEK -> UserMasterKey -> VaultKey -> credential plaintext
                (browser memory only while unlocked)
```

Google authenticates identity. It is not a source of encryption key material. OAuth access/refresh tokens must never be hashed or transformed into VaultKeys.

## Attack matrix

| Threat | Required outcome | Current status |
| --- | --- | --- |
| Full Supabase database dump | No credential plaintext | Designed for this |
| `service_role` or DB admin compromise | Ciphertext readable/deletable, plaintext unavailable | Designed for confidentiality; availability still exposed |
| Another authenticated user | Cannot enumerate/read other user's vault graph | RLS foundation deployed and tested |
| Google account takeover | Attacker gets account session but still needs vault secret | Primary Google + separate secret flow implements this boundary |
| Legacy Supabase password compromise | Legacy users remain at higher risk until migrated | Migration-only path retained |
| Stored DB tampering | AES-GCM rejects ciphertext/tag tampering | Implemented; new credential v2 also uses protocol AAD |
| Ciphertext protocol substitution | New credential ciphertext is domain-separated with AAD | Implemented for credential v2 |
| XSS / compromised frontend bundle | Consider plaintext compromised after unlock | Cannot be solved by at-rest crypto; CSP/supply-chain controls reduce likelihood |
| Malicious browser extension / endpoint malware | Consider plaintext compromised after unlock | Out of web-app cryptographic boundary |
| Stolen locked browser session | Session alone should not contain runtime crypto keys | Keys kept in memory and auto-lock clears application references |
| Destructive DB attack | Restore encrypted history/backups | Not complete; recovery/versioning required |
| Lost vault secret | Recover using independent recovery material | Not complete; do not claim recoverability |
| Removed shared member | Future access revoked through key rotation | Sharing protocol not complete |

## Client-side compromise is the ceiling

AES-256-GCM protects stored records. It cannot protect a secret after the legitimate client has decrypted it. A malicious release can wait for unlock and exfiltrate plaintext or invoke the same decrypt operations as the UI.

Therefore a password-manager deployment must treat source control and deployment authorization as cryptographic infrastructure, not ordinary DevOps.

## Metadata privacy

Decrypted vault metadata must not be sent to third parties. In particular, service/domain-derived favicon requests are forbidden. Platform marks must use bundled/local assets or generic initials.

## Key lifecycle

- KEK: derived from vault secret with Argon2id; never persisted.
- UserMasterKey: random AES-256 key; persisted only wrapped; runtime copies should be non-extractable.
- VaultKey: one random key per vault; persisted only wrapped for authorized members; loaded runtime copies should be non-extractable.
- Credential payload: encrypted with VaultKey and AES-256-GCM.
- Credential crypto v2: uses authenticated additional data for domain separation.

JavaScript cannot guarantee physical RAM zeroization. Clearing references and overwriting transient buffers are best-effort measures, not a hardware erasure guarantee.

## Residual high-priority work

1. Recovery key / encrypted backup design before claiming safe recovery.
2. Complete asymmetric invitation and shared-vault revocation protocol.
3. Browser adversarial tests for CSP and XSS sinks.
4. Session/MFA policy for high-impact operations.
5. Protected deployment path and required CI checks.
6. Periodic dependency, Supabase advisor and RLS regression audits.
