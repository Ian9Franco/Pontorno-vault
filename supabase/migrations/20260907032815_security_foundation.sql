-- Security Foundation: replace ALL legacy policies on the authorization graph.
-- Existing memberships require an operator audit; their provenance is unknown.
-- No invitation/key exchange protocol exists yet: client membership writes are closed.
BEGIN;

DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT tablename, policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename IN
      ('families', 'family_members', 'vaults', 'vault_members', 'credentials')
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, p.tablename);
  END LOOP;
END $$;

ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credentials ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.families, public.family_members, public.vaults,
  public.vault_members, public.credentials FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.families, public.family_members, public.vaults,
  public.vault_members, public.credentials TO authenticated;
GRANT INSERT ON public.families, public.family_members, public.credentials TO authenticated;
GRANT DELETE ON public.vaults, public.credentials TO authenticated;
GRANT UPDATE (name, type, updated_at) ON public.vaults TO authenticated;
GRANT UPDATE (encrypted_payload, nonce, crypto_version, updated_at)
  ON public.credentials TO authenticated;

CREATE SCHEMA IF NOT EXISTS vault_private;
REVOKE ALL ON SCHEMA vault_private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA vault_private TO authenticated;
-- Internal ownership lookup avoids families -> members -> families RLS recursion.
CREATE FUNCTION vault_private.owns_family(p_family_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.families WHERE id = p_family_id AND created_by = (select auth.uid()));
$$;
REVOKE ALL ON FUNCTION vault_private.owns_family(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION vault_private.owns_family(uuid) TO authenticated;

-- Own-row membership reads avoid recursive RLS and expose only one's own wrapper.
CREATE POLICY family_members_read ON public.family_members FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));
CREATE POLICY families_read ON public.families FOR SELECT TO authenticated
  USING (created_by = (select auth.uid()) OR EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.family_id = families.id AND fm.user_id = (select auth.uid())));
CREATE POLICY families_create ON public.families FOR INSERT TO authenticated
  WITH CHECK (created_by = (select auth.uid()));
-- Only a family's creator may bootstrap their own OWNER membership.
CREATE POLICY family_members_bootstrap ON public.family_members FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()) AND role = 'OWNER'
    AND vault_private.owns_family(family_id));

CREATE POLICY vault_members_read ON public.vault_members FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));
CREATE POLICY vaults_read ON public.vaults FOR SELECT TO authenticated
  USING (owner_user_id = (select auth.uid()) OR EXISTS (
    SELECT 1 FROM public.vault_members vm
    WHERE vm.vault_id = vaults.id AND vm.user_id = (select auth.uid())));
CREATE POLICY vaults_update ON public.vaults FOR UPDATE TO authenticated
  USING (owner_user_id = (select auth.uid()))
  WITH CHECK (owner_user_id = (select auth.uid()));
CREATE POLICY vaults_delete ON public.vaults FOR DELETE TO authenticated
  USING (owner_user_id = (select auth.uid()));

CREATE POLICY credentials_read ON public.credentials FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.vault_members vm
    WHERE vm.vault_id = credentials.vault_id AND vm.user_id = (select auth.uid())));
CREATE POLICY credentials_create ON public.credentials FOR INSERT TO authenticated
  WITH CHECK (created_by = (select auth.uid()) AND EXISTS (
    SELECT 1 FROM public.vault_members vm WHERE vm.vault_id = credentials.vault_id
      AND vm.user_id = (select auth.uid()) AND vm.permissions IN ('WRITE', 'ADMIN')));
CREATE POLICY credentials_update ON public.credentials FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.vault_members vm
    WHERE vm.vault_id = credentials.vault_id AND vm.user_id = (select auth.uid())
      AND vm.permissions IN ('WRITE', 'ADMIN')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.vault_members vm
    WHERE vm.vault_id = credentials.vault_id AND vm.user_id = (select auth.uid())
      AND vm.permissions IN ('WRITE', 'ADMIN')));
CREATE POLICY credentials_delete ON public.credentials FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.vault_members vm
    WHERE vm.vault_id = credentials.vault_id AND vm.user_id = (select auth.uid())
      AND vm.permissions IN ('WRITE', 'ADMIN')));

-- Type conversion cannot silently retain shared access on a personal vault.
CREATE FUNCTION vault_private.guard_vault_type() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  IF NEW.type = 'PERSONAL' AND OLD.type <> NEW.type AND EXISTS (
    SELECT 1 FROM public.vault_members
    WHERE vault_id = OLD.id AND user_id <> OLD.owner_user_id
  ) THEN
    RAISE EXCEPTION 'Revoke shared access before converting to personal' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION vault_private.guard_vault_type() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER security_guard_vault_type BEFORE UPDATE OF type ON public.vaults
  FOR EACH ROW EXECUTE FUNCTION vault_private.guard_vault_type();

-- Intentional authenticated RPC boundary. The privileged implementation is private.
-- No caller-supplied owner, vault id, recipient, family or permission is accepted.
CREATE FUNCTION vault_private.create_owned_vault(
  p_name text, p_type public.vault_type, p_encrypted_vault_key text, p_nonce text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE caller uuid := auth.uid(); new_id uuid;
BEGIN
  IF caller IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  IF p_name IS NULL OR length(btrim(p_name)) NOT BETWEEN 1 AND 200
    OR p_type IS NULL OR p_encrypted_vault_key IS NULL OR p_nonce IS NULL THEN
    RAISE EXCEPTION 'Invalid vault parameters' USING ERRCODE = '22023';
  END IF;
  IF octet_length(decode(p_encrypted_vault_key, 'base64')) <> 48
    OR octet_length(decode(p_nonce, 'base64')) <> 12 THEN
    RAISE EXCEPTION 'Invalid wrapped key or nonce length' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.vaults (owner_user_id, name, type)
    VALUES (caller, btrim(p_name), p_type) RETURNING id INTO new_id;
  INSERT INTO public.vault_members (vault_id, user_id, encrypted_vault_key, nonce, permissions)
    VALUES (new_id, caller, p_encrypted_vault_key, p_nonce, 'ADMIN');
  RETURN new_id;
END $$;
REVOKE ALL ON FUNCTION vault_private.create_owned_vault(text, public.vault_type, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA vault_private TO authenticated;
GRANT EXECUTE ON FUNCTION vault_private.create_owned_vault(text, public.vault_type, text, text)
  TO authenticated;
CREATE FUNCTION public.create_owned_vault(
  p_name text, p_type public.vault_type, p_encrypted_vault_key text, p_nonce text
) RETURNS uuid LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$
  SELECT vault_private.create_owned_vault(p_name, p_type, p_encrypted_vault_key, p_nonce);
$$;
REVOKE ALL ON FUNCTION public.create_owned_vault(text, public.vault_type, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_owned_vault(text, public.vault_type, text, text)
  TO authenticated;

CREATE INDEX IF NOT EXISTS idx_families_created_by ON public.families(created_by);
CREATE INDEX IF NOT EXISTS idx_vaults_family_id ON public.vaults(family_id);
CREATE INDEX IF NOT EXISTS idx_vaults_owner_user_id ON public.vaults(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_credentials_created_by ON public.credentials(created_by);
COMMIT;
