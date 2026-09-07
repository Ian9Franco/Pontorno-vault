# Recovery and Shared Vault Design Requirements

These features must not be shipped as partial convenience features. Both change the key graph and therefore need explicit protocols and adversarial tests.

## Recovery

### Required property

Losing Google access must not automatically mean losing the vault, and compromising Google must not automatically decrypt the vault. Recovery therefore needs independent cryptographic material.

### Recommended design

Generate a random 256-bit Recovery Key on-device during enrollment. Use it to wrap the existing UserMasterKey with an authenticated, versioned envelope. Store only the wrapped recovery envelope server-side and show/export the Recovery Key once for offline custody.

A recovery flow must:

1. authenticate the account or use a deliberately defined account-recovery path;
2. accept the independent Recovery Key locally;
3. unwrap the same UserMasterKey;
4. allow establishing a new vault secret/KEK without reciphering all credentials;
5. invalidate/rotate obsolete recovery envelopes after successful recovery.

Do not email the Recovery Key, derive it from Google OAuth tokens, store it in Supabase plaintext, or silently copy it to analytics/logging systems.

Until this exists, the UI and documentation must state that a lost vault secret can permanently lose access.

## Shared vault invitations

The server cannot safely manufacture a recipient wrapper from two symmetric UserMasterKeys it does not know. A complete protocol needs a cryptographic identity per member.

Recommended shape:

- each user owns a long-term asymmetric key pair generated client-side;
- only the public key is published to the service;
- invitations identify a specific vault, sender, recipient, expiry and nonce;
- the existing VaultKey is encrypted to the recipient using a standard audited construction such as HPKE/X25519-based tooling;
- acceptance is atomic and protected against replay;
- SQL never receives UserMasterKeys or plaintext VaultKeys.

Do not invent custom public-key crypto.

## Revocation

Removing a member stops future server access but cannot erase secrets they legitimately saw earlier. To protect future updates:

1. remove/revoke membership;
2. generate a fresh VaultKey;
3. re-encrypt current vault records with the new key;
4. create new wrappers only for remaining authorized members;
5. commit the rotation atomically or with a resumable, integrity-checked protocol.

The product must never claim retroactive revocation of knowledge.
