# Test Master Sandbox

Pontorno Vault exposes one **public, disposable test account** while the product is in test phase.

- Email: `master@pontorno-vault.test`
- Master password: `VaultMaster-Test-2026!`

## Security boundary

This account is intentionally **not** a Supabase Auth administrator and does not receive access to production/shared vault rows.

When these exact credentials are used, the client routes the session to the existing encrypted local-storage vault path:

- Argon2id still derives the KEK in the browser.
- AES-GCM still encrypts the vault payload locally.
- Keys remain client-side/in memory while unlocked.
- CRUD operations are forced to local encrypted persistence.
- The session never authenticates against Supabase.

The credentials are public by design and must never be used for real secrets. Remove this sandbox before production launch.
