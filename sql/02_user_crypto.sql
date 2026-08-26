-- =============================================================================
-- TABLA: user_crypto (Metadatos criptográficos para Zero-Knowledge Envelope Encryption)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.user_crypto (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    encrypted_user_key TEXT NOT NULL,       -- Base64 AES-256-GCM UserMasterKey cifrada con KEK
    user_key_nonce TEXT NOT NULL,           -- Base64 IV de 12 bytes
    kdf_salt TEXT NOT NULL,                 -- Base64 Salt de 16 bytes para Argon2id
    kdf_algorithm TEXT NOT NULL DEFAULT 'Argon2id',
    kdf_parameters JSONB NOT NULL DEFAULT '{"timeCost": 3, "memoryCost": 65536, "parallelism": 4, "hashLength": 32}'::jsonb,
    crypto_version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.user_crypto ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_crypto_select_own"
    ON public.user_crypto FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "user_crypto_insert_own"
    ON public.user_crypto FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_crypto_update_own"
    ON public.user_crypto FOR UPDATE
    USING (auth.uid() = user_id);
