-- HISTORICAL ONLY: unsafe policies. Do not deploy. See supabase/SECURITY_FOUNDATION.md.
-- =============================================================================
-- TABLA: credentials (Credenciales cifradas con AES-256-GCM)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.credentials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vault_id UUID NOT NULL REFERENCES public.vaults(id) ON DELETE CASCADE,
    encrypted_payload TEXT NOT NULL,        -- JSON cifrado: platform, username, password, url, notes
    nonce TEXT NOT NULL,                    -- Base64 IV de 12 bytes
    crypto_version INTEGER NOT NULL DEFAULT 1,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "credentials_select_members"
    ON public.credentials FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.vault_members
            WHERE vault_members.vault_id = credentials.vault_id
              AND vault_members.user_id = auth.uid()
        )
    );

CREATE POLICY "credentials_insert_write"
    ON public.credentials FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.vault_members
            WHERE vault_members.vault_id = credentials.vault_id
              AND vault_members.user_id = auth.uid()
              AND vault_members.permissions IN ('WRITE', 'ADMIN')
        )
    );

CREATE POLICY "credentials_update_write"
    ON public.credentials FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.vault_members
            WHERE vault_members.vault_id = credentials.vault_id
              AND vault_members.user_id = auth.uid()
              AND vault_members.permissions IN ('WRITE', 'ADMIN')
        )
    );

CREATE POLICY "credentials_delete_write"
    ON public.credentials FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.vault_members
            WHERE vault_members.vault_id = credentials.vault_id
              AND vault_members.user_id = auth.uid()
              AND vault_members.permissions IN ('WRITE', 'ADMIN')
        )
    );

-- Índices de rendimiento
CREATE INDEX IF NOT EXISTS idx_credentials_vault_id ON public.credentials(vault_id);
CREATE INDEX IF NOT EXISTS idx_credentials_created_by ON public.credentials(created_by);
