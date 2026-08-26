-- =============================================================================
-- TABLAS: vaults y vault_members (Bóvedas personales y compartidas con VaultKey envuelta)
-- =============================================================================

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

CREATE POLICY "vaults_select_members"
    ON public.vaults FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.vault_members
            WHERE vault_members.vault_id = vaults.id
              AND vault_members.user_id = auth.uid()
        )
    );

CREATE POLICY "vaults_insert_owner"
    ON public.vaults FOR INSERT
    WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "vault_members_select_own_or_admin"
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

CREATE POLICY "vault_members_insert_admin"
    ON public.vault_members FOR INSERT
    WITH CHECK (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM public.vault_members AS vm
            WHERE vm.vault_id = vault_members.vault_id
              AND vm.user_id = auth.uid()
              AND vm.permissions = 'ADMIN'
        )
    );
