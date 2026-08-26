-- =============================================================================
-- Family Vault — Script Completo All-in-One para Supabase SQL Editor
-- Copia y pega todo el contenido de este archivo en el editor SQL de Supabase
-- =============================================================================

-- 1. Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Función de utilidad para actualizar la columna updated_at automáticamente
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- 2. TABLA: profiles
-- Información pública del usuario vinculada a auth.users
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL DEFAULT 'Usuario',
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "profiles_update_own"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

CREATE OR REPLACE TRIGGER trigger_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- -----------------------------------------------------------------------------
-- 3. TABLA: user_crypto
-- Metadatos criptográficos para desbloqueo del cliente (Envelope Encryption)
-- NOTA: Supabase NUNCA almacena ni conoce la contraseña maestra ni las claves en texto plano.
-- -----------------------------------------------------------------------------
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

CREATE OR REPLACE TRIGGER trigger_user_crypto_updated_at
    BEFORE UPDATE ON public.user_crypto
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- -----------------------------------------------------------------------------
-- 4. TABLAS: families & family_members
-- Grupos y membresías familiares
-- -----------------------------------------------------------------------------
DO $$ BEGIN
    CREATE TYPE public.family_role AS ENUM ('OWNER', 'ADMIN', 'MEMBER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.families (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.family_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role public.family_role NOT NULL DEFAULT 'MEMBER',
    joined_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(family_id, user_id)
);

ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "families_select_members"
    ON public.families FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.family_members
            WHERE family_members.family_id = families.id
              AND family_members.user_id = auth.uid()
        )
    );

CREATE POLICY "families_insert_owner"
    ON public.families FOR INSERT
    WITH CHECK (auth.uid() = created_by);

CREATE POLICY "family_members_select_shared"
    ON public.family_members FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.family_members AS fm
            WHERE fm.family_id = family_members.family_id
              AND fm.user_id = auth.uid()
        )
    );

CREATE POLICY "family_members_insert_admin"
    ON public.family_members FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.family_members AS fm
            WHERE fm.family_id = family_members.family_id
              AND fm.user_id = auth.uid()
              AND fm.role IN ('OWNER', 'ADMIN')
        )
        OR (auth.uid() = user_id)
    );

-- -----------------------------------------------------------------------------
-- 5. TABLAS: vaults & vault_members
-- Bóvedas personales y compartidas con VaultKey envuelta por miembro
-- -----------------------------------------------------------------------------
DO $$ BEGIN
    CREATE TYPE public.vault_type AS ENUM ('PERSONAL', 'SHARED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.vault_permission AS ENUM ('READ', 'WRITE', 'ADMIN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.vaults (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID REFERENCES public.families(id) ON DELETE CASCADE,
    owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type public.vault_type NOT NULL DEFAULT 'PERSONAL',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.vaults ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.vault_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vault_id UUID NOT NULL REFERENCES public.vaults(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    encrypted_vault_key TEXT NOT NULL,       -- Base64 VaultKey cifrada con UserMasterKey del usuario
    nonce TEXT NOT NULL,                     -- Base64 IV de 12 bytes
    permissions public.vault_permission NOT NULL DEFAULT 'READ',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(vault_id, user_id)
);

ALTER TABLE public.vault_members ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- POLÍTICAS RLS NO RECURSIVAS PARA VAULTS
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "vaults_select_members" ON public.vaults;
DROP POLICY IF EXISTS "vaults_select" ON public.vaults;
DROP POLICY IF EXISTS "vaults_insert_owner" ON public.vaults;
DROP POLICY IF EXISTS "vaults_insert" ON public.vaults;
DROP POLICY IF EXISTS "vaults_update" ON public.vaults;
DROP POLICY IF EXISTS "vaults_delete" ON public.vaults;

CREATE POLICY "vaults_select"
    ON public.vaults FOR SELECT
    USING (
        type = 'SHARED'
        OR owner_user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.vault_members
            WHERE vault_members.vault_id = vaults.id
              AND vault_members.user_id = auth.uid()
        )
    );

CREATE POLICY "vaults_insert"
    ON public.vaults FOR INSERT
    WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "vaults_update"
    ON public.vaults FOR UPDATE
    USING (auth.uid() = owner_user_id);

CREATE POLICY "vaults_delete"
    ON public.vaults FOR DELETE
    USING (auth.uid() = owner_user_id);

-- -----------------------------------------------------------------------------
-- POLÍTICAS RLS NO RECURSIVAS PARA VAULT_MEMBERS
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "vault_members_select_own_or_admin" ON public.vault_members;
DROP POLICY IF EXISTS "vault_members_select" ON public.vault_members;
DROP POLICY IF EXISTS "vault_members_insert_admin" ON public.vault_members;
DROP POLICY IF EXISTS "vault_members_insert" ON public.vault_members;
DROP POLICY IF EXISTS "vault_members_update_admin" ON public.vault_members;
DROP POLICY IF EXISTS "vault_members_update" ON public.vault_members;
DROP POLICY IF EXISTS "vault_members_delete" ON public.vault_members;

CREATE POLICY "vault_members_select"
    ON public.vault_members FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "vault_members_insert"
    ON public.vault_members FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "vault_members_update"
    ON public.vault_members FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "vault_members_delete"
    ON public.vault_members FOR DELETE
    USING (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- 6. TABLA: credentials
-- Credenciales cifradas en Base64 con AES-256-GCM
-- -----------------------------------------------------------------------------
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

CREATE OR REPLACE TRIGGER trigger_credentials_updated_at
    BEFORE UPDATE ON public.credentials
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- -----------------------------------------------------------------------------
-- 8. TABLA: verification_codes (Inbox de Códigos OTP familiares y Magic Links)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.verification_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_name TEXT NOT NULL,
    sender_email TEXT,
    subject TEXT,
    code TEXT NOT NULL,
    snippet TEXT,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (timezone('utc'::text, now()) + interval '15 minutes'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.verification_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "verification_codes_select_authenticated"
    ON public.verification_codes FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "verification_codes_insert_all"
    ON public.verification_codes FOR INSERT
    WITH CHECK (true);

CREATE POLICY "verification_codes_delete_authenticated"
    ON public.verification_codes FOR DELETE
    TO authenticated
    USING (true);

CREATE INDEX IF NOT EXISTS idx_verification_codes_created_at ON public.verification_codes(created_at DESC);
