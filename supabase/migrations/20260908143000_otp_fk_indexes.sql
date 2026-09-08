begin;

create index if not exists otp_aliases_key_vault
  on public.otp_aliases(key_id, vault_id);
create index if not exists otp_codes_alias_context
  on public.otp_codes(alias_id, vault_id, credential_id);
create index if not exists otp_codes_key_vault
  on public.otp_codes(key_id, vault_id);

drop index if exists public.otp_aliases_key;
drop index if exists public.otp_codes_alias;
drop index if exists public.otp_codes_key;

commit;
