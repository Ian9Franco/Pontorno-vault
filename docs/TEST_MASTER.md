# Test Master Sandbox

Pontorno Vault exposes one **public, disposable test account** while the product is in test phase.

- Email: `master@pontorno-vault.test`
- Master password: `VaultMaster-Test-2026!`

## Security boundary

This account is intentionally **not** a Supabase Auth administrator and does not receive access to production/shared vault rows.

Use **Probar interfaz · Sandbox** on the access screen, or enter these credentials through legacy login. The sandbox uses its own encrypted storage key, `pontorno_vault_test_master_store_v2`, separate from the personal demo. Existing demo data is never overwritten or reused. Old sandbox data in the demo key is retained but is not imported automatically.

- Argon2id still derives the KEK in the browser.
- AES-GCM still encrypts the vault payload locally.
- Keys remain client-side/in memory while unlocked.
- CRUD operations are forced to local encrypted persistence.
- The session never authenticates against Supabase.
- OTP APIs and Realtime subscriptions are disabled for the sandbox, even if Supabase is configured.
- Reloading restores a locked sandbox; its public password unlocks it again.
- The public sandbox password cannot be rotated; the profile name and vault contents can be edited locally.

The credentials are public by design and must never be used for real secrets. Remove this sandbox before production launch.
