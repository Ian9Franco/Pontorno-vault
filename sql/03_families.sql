-- =============================================================================
-- TABLAS: families y family_members (Workspaces y roles familiares)
-- =============================================================================

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
