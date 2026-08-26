-- =============================================================================
-- TABLA: verification_codes (Inbox de Códigos OTP familiares y Magic Links)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.verification_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_name TEXT NOT NULL,              -- e.g. "Disney+", "Netflix", "Spotify", "Amazon"
    sender_email TEXT,                       -- e.g. "account@disneyplus.com"
    subject TEXT,                            -- e.g. "Tu código de acceso único"
    code TEXT NOT NULL,                      -- e.g. "492810" o URL de verificación
    snippet TEXT,                            -- Extracto breve del correo
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (timezone('utc'::text, now()) + interval '15 minutes'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.verification_codes ENABLE ROW LEVEL SECURITY;

-- Permitir que cualquier usuario autenticado de la familia pueda ver los códigos
CREATE POLICY "verification_codes_select_authenticated"
    ON public.verification_codes FOR SELECT
    TO authenticated
    USING (true);

-- Permitir inserción desde API / Webhooks
CREATE POLICY "verification_codes_insert_all"
    ON public.verification_codes FOR INSERT
    WITH CHECK (true);

-- Permitir eliminación por usuarios autenticados
CREATE POLICY "verification_codes_delete_authenticated"
    ON public.verification_codes FOR DELETE
    TO authenticated
    USING (true);

CREATE INDEX IF NOT EXISTS idx_verification_codes_created_at ON public.verification_codes(created_at DESC);
