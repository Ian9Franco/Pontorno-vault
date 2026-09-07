# Pontorno Vault 🔐

Password and credential vault for personal/family use, built around client-side envelope encryption and strict Supabase authorization.

## Security model

Pontorno Vault deliberately separates two questions:

```text
Google / Supabase Auth  -> Who are you? / which rows may you access?
Vault secret            -> Can this device unwrap the cryptographic keys?
```

For the primary synced flow, Google authenticates the account and a **different vault secret** is entered only after authentication. That vault secret is processed in the browser with Argon2id and is not used as the Google or Supabase password.

> Legacy note: accounts created before this separation can still use the password-based **Acceso legado** only to migrate. Those accounts should link Google from Settings before rotating the vault secret.

### Key hierarchy

```text
Vault secret
   + random salt
      |
      v
Argon2id KEK
      |
      v
wrapped random UserMasterKey
      |
      +--> wrapped VaultKey A --> AES-256-GCM credentials
      +--> wrapped VaultKey B --> AES-256-GCM credentials
```

- Argon2id default: 64 MiB memory, 3 iterations, parallelism 4.
- AES-256-GCM with 96-bit random nonces and 128-bit authentication tags.
- New credential records use crypto version 2 with authenticated additional data for protocol domain separation.
- Runtime keys loaded from storage are non-extractable Web Crypto keys where the flow permits it.
- Sensitive credential fields (`platform`, `username`, `password`, `url`, `notes`) live inside the encrypted payload.
- Decrypted domains are not sent to third-party favicon/icon services.
- Auto-lock clears application references to runtime keys and decrypted credential state.

## What zero-knowledge means here

A database dump should not be enough to decrypt credentials. Supabase stores ciphertext, salts, nonces, KDF metadata and wrapped keys, not the plaintext VaultKey/UserMasterKey.

This does **not** mean an unlocked web application is invulnerable. A compromised frontend deployment, XSS, malicious extension or endpoint malware can potentially read plaintext after legitimate decryption. See [SECURITY.md](./SECURITY.md) and [the threat model](./docs/THREAT_MODEL.md).

## Authorization layer

The production Supabase schema uses Row Level Security around profiles, crypto metadata, families, memberships, vaults and credentials. Vault creation crosses an intentional RPC boundary that derives ownership from `auth.uid()` instead of trusting a client-supplied owner.

Historical `sql/` scripts are not the deployment source of truth. Use `supabase/migrations/` and review [Security Foundation](./supabase/SECURITY_FOUNDATION.md) plus [Production Security Status](./supabase/PRODUCTION_SECURITY_STATUS.md).

## Authentication migration

New synced users should use Google. Existing password-auth users should follow [AUTH_MIGRATION.md](./docs/AUTH_MIGRATION.md) so the same Supabase user ID keeps ownership of existing vaults.

External configuration still required:

1. enable Google in Supabase Auth;
2. configure allowed redirect URLs;
3. enable Manual Identity Linking for the migration button;
4. enable leaked-password protection while legacy password login exists.

## CSP and privacy

`proxy.ts` generates a per-request nonce and applies a strict script CSP with `strict-dynamic`. The application only permits its own origin plus the configured Supabase origin for network connections. Because Argon2 runs as WebAssembly, the CSP explicitly allows WebAssembly evaluation without opening general production `unsafe-eval`.

## Recovery and sharing

Cryptographic recovery and full multi-user key exchange are **not complete** and are not represented as finished features. The required designs are documented in [RECOVERY_AND_SHARING.md](./docs/RECOVERY_AND_SHARING.md).

## Development

```bash
npm ci
npm run typecheck
npm test
npm run build
```

Environment:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-public-key
```

The public/publishable Supabase key is expected to be present in the browser. Authorization depends on RLS; never expose a `service_role`/secret key to client code.

## Security gate

Pull requests and pushes to `main` run a GitHub Actions gate with reproducible install, TypeScript checking, unit/security tests, production build and a critical production dependency audit. Dependabot tracks npm and GitHub Actions updates.

Operational hardening requirements are in [DEPLOYMENT_HARDENING.md](./docs/DEPLOYMENT_HARDENING.md).
