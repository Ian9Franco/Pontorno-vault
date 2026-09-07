-- Read-only. Run with an authorized operator connection, never from a public client.
-- No emails, names, passwords, ciphertext, nonces or key material are exported.
-- Save results outside version control (supabase/review-private/).
SELECT jsonb_build_object(
  'captured_at', now(),
  'vaults', (SELECT coalesce(jsonb_agg(x), '[]'::jsonb) FROM (
    SELECT v.id, v.type, v.owner_user_id, v.family_id, v.created_at,
      (SELECT count(*) FROM public.credentials c WHERE c.vault_id = v.id) AS credential_count,
      NOT EXISTS (SELECT 1 FROM public.vault_members vm
        WHERE vm.vault_id = v.id AND vm.user_id = v.owner_user_id) AS owner_missing_membership
    FROM public.vaults v ORDER BY v.id
  ) x),
  'vault_members', (SELECT coalesce(jsonb_agg(x), '[]'::jsonb) FROM (
    SELECT vm.id, vm.vault_id, vm.user_id, vm.permissions, vm.created_at, vm.updated_at,
      vm.user_id = v.owner_user_id AS is_owner,
      vm.encrypted_vault_key IS NOT NULL AND vm.encrypted_vault_key <> '' AS has_wrapper,
      v.type = 'PERSONAL' AND vm.user_id <> v.owner_user_id AS personal_non_owner,
      vm.permissions = 'ADMIN' AND vm.user_id <> v.owner_user_id AS non_owner_admin
    FROM public.vault_members vm JOIN public.vaults v ON v.id = vm.vault_id
    ORDER BY vm.vault_id, vm.user_id
  ) x),
  'families', (SELECT coalesce(jsonb_agg(x), '[]'::jsonb) FROM (
    SELECT id, created_by, created_at FROM public.families ORDER BY id
  ) x),
  'family_members', (SELECT coalesce(jsonb_agg(x), '[]'::jsonb) FROM (
    SELECT fm.id, fm.family_id, fm.user_id, fm.role, fm.joined_at,
      fm.user_id = f.created_by AS is_creator,
      fm.role = 'OWNER' AND fm.user_id <> f.created_by AS non_creator_owner
    FROM public.family_members fm JOIN public.families f ON f.id = fm.family_id
    ORDER BY fm.family_id, fm.user_id
  ) x)
) AS inventory;
