-- =============================================================================
-- Family Vault — Initial Database Schema & Row Level Security (RLS) Policies
-- Migration: 20260826000000_init_schema.sql
-- Description: Zero-knowledge password manager schema with envelope encryption.
-- =============================================================================

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- 1. PROFILES
-- Public metadata associated with each Supabase auth user
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- -----------------------------------------------------------------------------
-- 2. USER_CRYPTO
-- Client-side cryptographic material needed for account derivation and unlocking.
-- Note: Supabase stores ciphertext, salts and nonces. The KEK and UserMasterKey
-- are NEVER stored in plaintext.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_crypto (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    encrypted_user_key TEXT NOT NULL,       -- Base64 AES-256-GCM encrypted UserMasterKey using KEK
    user_key_nonce TEXT NOT NULL,           -- Base64 12-byte IV for encrypted_user_key
    kdf_salt TEXT NOT NULL,                 -- Base64 random salt for Argon2id
    kdf_algorithm TEXT NOT NULL DEFAULT 'Argon2id',
    kdf_parameters JSONB NOT NULL,          -- e.g. {"timeCost": 3, "memoryCost": 65536, "parallelism": 4}
    crypto_version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.user_crypto ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own crypto metadata"
    ON public.user_crypto FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own crypto metadata"
    ON public.user_crypto FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own crypto metadata"
    ON public.user_crypto FOR UPDATE
    USING (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- 3. FAMILIES
-- Represents a family workspace
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.families (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 4. FAMILY_MEMBERS
-- Relates users to family workspaces with role-based governance
-- -----------------------------------------------------------------------------
CREATE TYPE public.family_role AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

CREATE TABLE IF NOT EXISTS public.family_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role public.family_role NOT NULL DEFAULT 'MEMBER',
    joined_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(family_id, user_id)
);

ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;

-- Family & Membership RLS:
CREATE POLICY "Family members can view their family"
    ON public.families FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.family_members
            WHERE family_members.family_id = families.id
              AND family_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Family members can view other members in their family"
    ON public.family_members FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.family_members AS fm
            WHERE fm.family_id = family_members.family_id
              AND fm.user_id = auth.uid()
        )
    );

-- -----------------------------------------------------------------------------
-- 5. VAULTS
-- Logical vaults (Personal or Shared)
-- -----------------------------------------------------------------------------
CREATE TYPE public.vault_type AS ENUM ('PERSONAL', 'SHARED');

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

-- -----------------------------------------------------------------------------
-- 6. VAULT_MEMBERS
-- Encrypted Vault Key distribution per user.
-- Each authorized member receives a copy of the vault key wrapped with their UserMasterKey.
-- -----------------------------------------------------------------------------
CREATE TYPE public.vault_permission AS ENUM ('READ', 'WRITE', 'ADMIN');

CREATE TABLE IF NOT EXISTS public.vault_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vault_id UUID NOT NULL REFERENCES public.vaults(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    encrypted_vault_key TEXT NOT NULL,       -- Base64 AES-256-GCM encrypted VaultKey with user's UserMasterKey
    nonce TEXT NOT NULL,                     -- Base64 12-byte IV
    permissions public.vault_permission NOT NULL DEFAULT 'READ',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(vault_id, user_id)
);

ALTER TABLE public.vault_members ENABLE ROW LEVEL SECURITY;

-- Vaults & Vault Members RLS:
CREATE POLICY "Users can view vaults they are a member of"
    ON public.vaults FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.vault_members
            WHERE vault_members.vault_id = vaults.id
              AND vault_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can view vault_members for vaults they belong to"
    ON public.vault_members FOR SELECT
    USING (
        vault_members.user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.vault_members AS vm
            WHERE vm.vault_id = vault_members.vault_id
              AND vm.user_id = auth.uid()
              AND vm.permissions = 'ADMIN'
        )
    );

-- -----------------------------------------------------------------------------
-- 7. CREDENTIALS
-- Encrypted credentials belonging to a vault.
-- No plaintext fields are stored in the database.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.credentials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vault_id UUID NOT NULL REFERENCES public.vaults(id) ON DELETE CASCADE,
    encrypted_payload TEXT NOT NULL,        -- Base64 AES-256-GCM ciphertext of JSON CredentialPayload
    nonce TEXT NOT NULL,                    -- Base64 12-byte IV
    crypto_version INTEGER NOT NULL DEFAULT 1,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.credentials ENABLE ROW LEVEL SECURITY;

-- Credentials RLS:
CREATE POLICY "Users can view credentials in vaults they are members of"
    ON public.credentials FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.vault_members
            WHERE vault_members.vault_id = credentials.vault_id
              AND vault_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Users with WRITE or ADMIN can insert credentials"
    ON public.credentials FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.vault_members
            WHERE vault_members.vault_id = credentials.vault_id
              AND vault_members.user_id = auth.uid()
              AND vault_members.permissions IN ('WRITE', 'ADMIN')
        )
    );

CREATE POLICY "Users with WRITE or ADMIN can update credentials"
    ON public.credentials FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.vault_members
            WHERE vault_members.vault_id = credentials.vault_id
              AND vault_members.user_id = auth.uid()
              AND vault_members.permissions IN ('WRITE', 'ADMIN')
        )
    );

CREATE POLICY "Users with WRITE or ADMIN can delete credentials"
    ON public.credentials FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.vault_members
            WHERE vault_members.vault_id = credentials.vault_id
              AND vault_members.user_id = auth.uid()
              AND vault_members.permissions IN ('WRITE', 'ADMIN')
        )
    );

-- -----------------------------------------------------------------------------
-- INDEXES for fast lookup
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_family_members_user_id ON public.family_members(user_id);
CREATE INDEX IF NOT EXISTS idx_vault_members_user_id ON public.vault_members(user_id);
CREATE INDEX IF NOT EXISTS idx_credentials_vault_id ON public.credentials(vault_id);
