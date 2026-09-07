# Pontorno Vault Security Policy

Pontorno Vault stores data that can unlock other accounts. Security claims therefore have to be narrower than marketing claims and tied to an explicit threat model.

## Current security target

For the primary synced flow:

1. Google/Supabase Auth answers **who is the user?**
2. A separate vault secret derives a KEK with Argon2id **only in the browser**.
3. The KEK unwraps a random UserMasterKey.
4. The UserMasterKey unwraps per-vault keys.
5. Vault keys decrypt credential payloads.

The vault secret must not be reused as the Supabase Auth password. Password-based Supabase login remains only as a migration path for accounts created before this separation.

## What a database leak should reveal

A complete leak of the application database may reveal identifiers, timestamps, ciphertext, salts, nonces, KDF parameters and wrapped keys. It must not be sufficient to recover credential plaintext without the vault secret or an already-compromised client.

## What this model does not solve

No web password manager can cryptographically protect plaintext from JavaScript that is already trusted and running in the unlocked page. A compromised deployment, malicious browser extension, endpoint malware, debugger access or injected script may read secrets while the vault is unlocked.

The trusted computing base therefore includes the browser, operating system, delivered frontend bundle, GitHub, deployment platform, DNS/registrar, Supabase Auth/availability and the dependency supply chain.

See `docs/THREAT_MODEL.md` for the full matrix and `docs/DEPLOYMENT_HARDENING.md` for operational requirements.

## Reporting a vulnerability

Do not publish real credentials, session tokens, database dumps or working exploits in a public issue. Prefer GitHub private vulnerability reporting/security advisories when enabled; otherwise contact the repository owner privately and provide the smallest reproducible proof necessary.
