# Auth / Crypto Separation Migration

## Why this migration exists

The original flow reused one `masterPassword` both as the Supabase Auth password and as Argon2id input for the vault KEK. That meant the secret required to unwrap the UserMasterKey crossed the authentication network boundary.

The target design separates the two concerns:

- **Google / Supabase Auth:** account identity and RLS session.
- **Vault secret:** local cryptographic authorization only.

## New accounts

1. Sign in with Google.
2. Supabase creates/authenticates the user.
3. The app sees that `user_crypto` is absent.
4. The user creates a distinct vault secret.
5. Argon2id derives the KEK locally.
6. A random UserMasterKey is generated and only its wrapped form is stored.

The Google password and OAuth tokens are never used as encryption key material.

## Existing password-auth accounts

Do not create a second Supabase user and do not move rows between user IDs. The safe migration preserves the existing `auth.uid()`.

1. Use **Acceso legado** once with the old credentials.
2. Unlock the existing vault and verify a real credential can still be decrypted.
3. Open Settings and choose **Vincular Google**.
4. Complete Google OAuth identity linking while still authenticated as the existing user.
5. Return to Vault and verify the Google identity appears linked.
6. Sign out.
7. Sign in with Google.
8. Unlock using the existing vault secret.
9. Only after the above succeeds, rotate the vault secret if desired.

The UI deliberately blocks vault-secret rotation on a synced legacy account until Google is linked. This prevents the old Supabase password and the newly rotated crypto secret from silently diverging.

## Supabase configuration required outside this repository

- Enable the Google social provider.
- Configure the production and local redirect URLs.
- Enable Manual Identity Linking if the Settings migration button is used.
- Keep leaked-password protection enabled while the legacy password path exists.
- Prefer short-lived access tokens appropriate for a sensitive application and review MFA/AAL policy for privileged operations.

## Decommissioning the legacy path

Remove password-based login only after every account that must retain data has a verified non-password identity linked to the same Supabase user. Before removal, export an inventory of auth users/providers and confirm no required account is email-password only.
