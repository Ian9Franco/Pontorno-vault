-- Containment: the global OTP inbox stays closed until signed, scoped ingestion exists.
BEGIN;
CREATE TABLE IF NOT EXISTS public.verification_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name text NOT NULL, sender_email text, subject text, code text NOT NULL,
  snippet text, expires_at timestamptz NOT NULL DEFAULT (now() + interval '15 minutes'),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.verification_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_crypto ENABLE ROW LEVEL SECURITY;
DO $$ DECLARE p record; BEGIN
  FOR p IN SELECT tablename, policyname FROM pg_policies
    WHERE schemaname='public' AND tablename IN ('verification_codes','profiles','user_crypto')
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, p.tablename);
  END LOOP;
END $$;
REVOKE ALL ON public.verification_codes, public.profiles, public.user_crypto
  FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.profiles, public.user_crypto TO authenticated;
CREATE POLICY profiles_read ON public.profiles FOR SELECT TO authenticated
  USING (id = (select auth.uid()));
CREATE POLICY profiles_create ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = (select auth.uid()));
CREATE POLICY profiles_update ON public.profiles FOR UPDATE TO authenticated
  USING (id = (select auth.uid())) WITH CHECK (id = (select auth.uid()));
CREATE POLICY user_crypto_read ON public.user_crypto FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));
CREATE POLICY user_crypto_create ON public.user_crypto FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY user_crypto_update ON public.user_crypto FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));
CREATE OR REPLACE FUNCTION public.handle_updated_at() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.handle_updated_at() FROM PUBLIC, anon, authenticated;
COMMIT;
