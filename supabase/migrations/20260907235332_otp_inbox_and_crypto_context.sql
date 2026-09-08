begin;
alter table public.vault_members add column if not exists crypto_version integer not null default 1 check (crypto_version in (1,2));

create function vault_private.create_owned_vault_v2(p_name text, p_type public.vault_type, p_encrypted_vault_key text, p_nonce text, p_vault_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare caller uuid := auth.uid();
begin
  if caller is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if p_vault_id is null or p_type is null or coalesce(length(btrim(p_name)),0) not between 1 and 200
    or coalesce(octet_length(decode(p_encrypted_vault_key,'base64')),0) <> 48
    or coalesce(octet_length(decode(p_nonce,'base64')),0) <> 12 then
    raise exception 'Invalid vault parameters' using errcode='22023'; end if;
  insert into public.vaults(id,owner_user_id,name,type) values(p_vault_id,caller,btrim(p_name),p_type);
  insert into public.vault_members(vault_id,user_id,encrypted_vault_key,nonce,permissions,crypto_version)
    values(p_vault_id,caller,p_encrypted_vault_key,p_nonce,'ADMIN',2);
  return p_vault_id;
end $$;
revoke all on function vault_private.create_owned_vault_v2(text,public.vault_type,text,text,uuid) from public,anon,authenticated;
grant execute on function vault_private.create_owned_vault_v2(text,public.vault_type,text,text,uuid) to authenticated;
create function public.create_owned_vault_v2(p_name text,p_type public.vault_type,p_encrypted_vault_key text,p_nonce text,p_vault_id uuid)
returns uuid language sql security invoker set search_path='' as $$
select vault_private.create_owned_vault_v2(p_name,p_type,p_encrypted_vault_key,p_nonce,p_vault_id);
$$;
revoke all on function public.create_owned_vault_v2(text,public.vault_type,text,text,uuid) from public,anon,authenticated;
grant execute on function public.create_owned_vault_v2(text,public.vault_type,text,text,uuid) to authenticated;

create table public.otp_access (
  vault_id uuid not null references public.vaults(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  primary key(vault_id,user_id)
);
create table public.otp_receiving_keys (
  id uuid primary key,
  vault_id uuid not null references public.vaults(id) on delete cascade,
  public_key jsonb not null check (public_key->>'kty'='RSA' and not public_key ? 'd' and octet_length(public_key::text)<2048),
  encrypted_private_key text not null check(length(encrypted_private_key) between 100 and 16000),
  nonce text not null check(octet_length(decode(nonce,'base64'))=12),
  created_at timestamptz not null default now(),
  unique(id,vault_id)
);
create table public.otp_aliases (
  id uuid primary key default gen_random_uuid(),
  vault_id uuid not null references public.vaults(id) on delete cascade,
  credential_id uuid not null unique references public.credentials(id) on delete cascade,
  key_id uuid not null,
  address_token text not null unique,
  service_key text not null check(service_key in ('netflix','disney','amazon','steam')),
  status text not null default 'setup' check(status in ('setup','active','paused')),
  setup_until timestamptz not null default now()+interval '30 minutes',
  last_received_at timestamptz,
  last_status text,
  created_at timestamptz not null default now(),
  foreign key(key_id,vault_id) references public.otp_receiving_keys(id,vault_id),
  unique(id,vault_id,credential_id)
);
create table public.otp_codes (
  id uuid primary key,
  alias_id uuid not null,
  vault_id uuid not null,
  credential_id uuid not null,
  key_id uuid not null,
  kind text not null check(kind in ('otp','setup')),
  envelope jsonb not null check(octet_length(envelope::text)<16000),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null check(expires_at > created_at and expires_at <= created_at+interval '15 minutes'),
  foreign key(alias_id,vault_id,credential_id) references public.otp_aliases(id,vault_id,credential_id) on delete cascade,
  foreign key(key_id,vault_id) references public.otp_receiving_keys(id,vault_id)
);
create table public.otp_delivery_jobs (
  id uuid primary key default gen_random_uuid(),
  event_id text not null check(length(event_id) between 1 and 200),
  email_id uuid not null,
  alias_id uuid not null references public.otp_aliases(id) on delete cascade,
  status text not null default 'pending' check(status in ('pending','processing','done','failed')),
  attempts integer not null default 0,
  available_at timestamptz not null default now(),
  lease_id uuid,
  locked_until timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  unique(event_id,alias_id),
  unique(email_id,alias_id)
);
create index otp_keys_vault on public.otp_receiving_keys(vault_id);
create index otp_aliases_vault on public.otp_aliases(vault_id);
create index otp_aliases_key_vault on public.otp_aliases(key_id,vault_id);
create index otp_codes_vault_expiry on public.otp_codes(vault_id,expires_at);
create index otp_codes_alias_context on public.otp_codes(alias_id,vault_id,credential_id);
create index otp_codes_key_vault on public.otp_codes(key_id,vault_id);
create index otp_jobs_pending on public.otp_delivery_jobs(available_at) where status in ('pending','processing');
create index otp_jobs_alias_created on public.otp_delivery_jobs(alias_id,created_at);
create index otp_access_user on public.otp_access(user_id);
alter table public.otp_access enable row level security;
alter table public.otp_receiving_keys enable row level security;
alter table public.otp_aliases enable row level security;
alter table public.otp_codes enable row level security;
alter table public.otp_delivery_jobs enable row level security;
revoke all on public.otp_access,public.otp_receiving_keys,public.otp_aliases,public.otp_codes,public.otp_delivery_jobs from public,anon,authenticated;
grant all on public.otp_access,public.otp_receiving_keys,public.otp_aliases,public.otp_codes,public.otp_delivery_jobs to service_role;
grant select on public.otp_access,public.otp_receiving_keys,public.otp_aliases,public.otp_codes to authenticated;
grant delete on public.otp_codes to authenticated;

create function vault_private.otp_owner(p_vault_id uuid) returns boolean language sql stable security definer set search_path='' as $$
select auth.uid() is not null and exists(select 1 from public.vaults v join public.vault_members m on m.vault_id=v.id and m.user_id=auth.uid() where v.id=p_vault_id and v.owner_user_id=auth.uid());
$$;
create function vault_private.otp_reader(p_vault_id uuid) returns boolean language sql stable security definer set search_path='' as $$
select auth.uid() is not null and exists(select 1 from public.vault_members m join public.vaults v on v.id=m.vault_id
 where v.id=p_vault_id and m.user_id=auth.uid() and (v.owner_user_id=auth.uid() or exists(select 1 from public.otp_access a where a.vault_id=v.id and a.user_id=auth.uid())));
$$;
revoke all on function vault_private.otp_owner(uuid),vault_private.otp_reader(uuid) from public,anon,authenticated;
grant execute on function vault_private.otp_owner(uuid),vault_private.otp_reader(uuid) to authenticated;
create policy otp_access_read on public.otp_access for select to authenticated using(user_id=(select auth.uid()) or vault_private.otp_owner(vault_id));
create policy otp_keys_read on public.otp_receiving_keys for select to authenticated using(vault_private.otp_reader(vault_id));
create policy otp_aliases_read on public.otp_aliases for select to authenticated using(vault_private.otp_reader(vault_id));
create policy otp_codes_read on public.otp_codes for select to authenticated using(
 expires_at>now() and vault_private.otp_reader(vault_id) and (kind='otp' or vault_private.otp_owner(vault_id)));
create policy otp_codes_delete on public.otp_codes for delete to authenticated using(vault_private.otp_reader(vault_id) and (kind='otp' or vault_private.otp_owner(vault_id)));

create function vault_private.configure_otp_alias(p_vault_id uuid,p_credential_id uuid,p_service_key text,p_key_id uuid,p_public_key jsonb,p_encrypted_private_key text,p_nonce text)
returns public.otp_aliases language plpgsql security definer set search_path='' as $$
declare result public.otp_aliases;
begin
 if not vault_private.otp_owner(p_vault_id) then raise exception 'Owner required' using errcode='42501'; end if;
 if not exists(select 1 from public.credentials where id=p_credential_id and vault_id=p_vault_id) then raise exception 'Invalid credential' using errcode='22023'; end if;
 if (select count(*) from public.otp_aliases where vault_id=p_vault_id)>=100 then raise exception 'Alias limit' using errcode='22023'; end if;
 insert into public.otp_receiving_keys(id,vault_id,public_key,encrypted_private_key,nonce) values(p_key_id,p_vault_id,p_public_key,p_encrypted_private_key,p_nonce);
 insert into public.otp_aliases(vault_id,credential_id,key_id,address_token,service_key)
 values(p_vault_id,p_credential_id,p_key_id,replace(gen_random_uuid()::text,'-','')||substr(replace(gen_random_uuid()::text,'-',''),1,8),p_service_key)
 on conflict(credential_id) do update set key_id=excluded.key_id,address_token=excluded.address_token,service_key=excluded.service_key,
 status='setup',setup_until=now()+interval '30 minutes',last_status=null,last_received_at=null returning * into result;
 -- Rotating an alias invalidates queued deliveries and previous codes.
 delete from public.otp_codes where alias_id=result.id;
 update public.otp_delivery_jobs set status='done',lease_id=null,last_error='alias_rotated' where alias_id=result.id and status in ('pending','processing');
 return result;
end $$;
create function public.configure_otp_alias(p_vault_id uuid,p_credential_id uuid,p_service_key text,p_key_id uuid,p_public_key jsonb,p_encrypted_private_key text,p_nonce text)
returns public.otp_aliases language sql security invoker set search_path='' as $$
select vault_private.configure_otp_alias(p_vault_id,p_credential_id,p_service_key,p_key_id,p_public_key,p_encrypted_private_key,p_nonce);
$$;
revoke all on function vault_private.configure_otp_alias(uuid,uuid,text,uuid,jsonb,text,text),public.configure_otp_alias(uuid,uuid,text,uuid,jsonb,text,text) from public,anon,authenticated;
grant execute on function vault_private.configure_otp_alias(uuid,uuid,text,uuid,jsonb,text,text),public.configure_otp_alias(uuid,uuid,text,uuid,jsonb,text,text) to authenticated;

create function vault_private.set_otp_alias_status(p_alias_id uuid,p_status text) returns void language plpgsql security definer set search_path='' as $$
declare a public.otp_aliases;
begin
 select * into a from public.otp_aliases where id=p_alias_id for update;
 if not found or not vault_private.otp_owner(a.vault_id) then raise exception 'Owner required' using errcode='42501'; end if;
 if p_status not in ('active','paused') then raise exception 'Invalid status' using errcode='22023'; end if;
 if p_status='active' and a.last_status='access_revoked' then raise exception 'Rotate receiving key first' using errcode='22023'; end if;
 update public.otp_aliases set status=p_status where id=p_alias_id;
 if p_status='paused' then
  delete from public.otp_codes where alias_id=p_alias_id;
  update public.otp_delivery_jobs set status='done',lease_id=null,last_error='alias_paused' where alias_id=p_alias_id and status in ('pending','processing');
 end if;
end $$;
create function public.set_otp_alias_status(p_alias_id uuid,p_status text) returns void language sql security invoker set search_path='' as $$
select vault_private.set_otp_alias_status(p_alias_id,p_status);
$$;
revoke all on function vault_private.set_otp_alias_status(uuid,text),public.set_otp_alias_status(uuid,text) from public,anon,authenticated;
grant execute on function vault_private.set_otp_alias_status(uuid,text),public.set_otp_alias_status(uuid,text) to authenticated;

create function vault_private.set_otp_access(p_vault_id uuid,p_user_id uuid,p_allow boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 if not vault_private.otp_owner(p_vault_id) then raise exception 'Owner required' using errcode='42501'; end if;
 if not exists(select 1 from public.vault_members where vault_id=p_vault_id and user_id=p_user_id) then raise exception 'Membership required' using errcode='22023'; end if;
 if p_allow then insert into public.otp_access values(p_vault_id,p_user_id) on conflict do nothing;
 else
  delete from public.otp_access where vault_id=p_vault_id and user_id=p_user_id;
  update public.otp_aliases set status='paused',last_status='access_revoked' where vault_id=p_vault_id;
  delete from public.otp_codes where vault_id=p_vault_id;
 end if;
end $$;
create function public.set_otp_access(p_vault_id uuid,p_user_id uuid,p_allow boolean) returns void language sql security invoker set search_path='' as $$
select vault_private.set_otp_access(p_vault_id,p_user_id,p_allow);
$$;
revoke all on function vault_private.set_otp_access(uuid,uuid,boolean),public.set_otp_access(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function vault_private.set_otp_access(uuid,uuid,boolean),public.set_otp_access(uuid,uuid,boolean) to authenticated;

create function vault_private.otp_members(p_vault_id uuid) returns table(user_id uuid,can_read boolean) language plpgsql security definer set search_path='' as $$
begin
 if not vault_private.otp_owner(p_vault_id) then raise exception 'Owner required' using errcode='42501'; end if;
 return query select m.user_id,(m.user_id=auth.uid() or a.user_id is not null) from public.vault_members m left join public.otp_access a on a.vault_id=m.vault_id and a.user_id=m.user_id where m.vault_id=p_vault_id;
end $$;
create function public.otp_members(p_vault_id uuid) returns table(user_id uuid,can_read boolean) language sql security invoker set search_path='' as $$
select * from vault_private.otp_members(p_vault_id);
$$;
revoke all on function vault_private.otp_members(uuid),public.otp_members(uuid) from public,anon,authenticated;
grant execute on function vault_private.otp_members(uuid),public.otp_members(uuid) to authenticated;

-- Service-only, bounded, idempotent enqueue. The caller cannot supply a vault id.
create function public.enqueue_otp_delivery(p_event_id text,p_email_id uuid,p_address_token text) returns void language plpgsql security invoker set search_path='' as $$
declare a public.otp_aliases;
begin
 select * into a from public.otp_aliases where address_token=p_address_token for update;
 if not found or a.status='paused' or (a.status='setup' and a.setup_until<now()) then return; end if;
 if exists(select 1 from public.otp_delivery_jobs where alias_id=a.id and (event_id=p_event_id or email_id=p_email_id)) then return; end if;
 if (select count(*) from public.otp_delivery_jobs where alias_id=a.id and created_at>now()-interval '1 minute')>=10 then return; end if;
 insert into public.otp_delivery_jobs(event_id,email_id,alias_id) values(p_event_id,p_email_id,a.id) on conflict do nothing;
end $$;
create function public.claim_otp_deliveries() returns setof public.otp_delivery_jobs language sql security invoker set search_path='' as $$
 with candidates as (
 select id from public.otp_delivery_jobs where attempts<5 and created_at>now()-interval '15 minutes'
 and ((status='pending' and available_at<=now()) or (status='processing' and locked_until<now()))
 order by available_at for update skip locked limit 3)
 update public.otp_delivery_jobs j set status='processing',attempts=attempts+1,lease_id=gen_random_uuid(),locked_until=now()+interval '2 minutes'
 from candidates c where j.id=c.id returning j.*;
$$;
create function public.finish_otp_delivery(p_job_id uuid,p_lease_id uuid,p_key_id uuid,p_kind text,p_envelope jsonb,p_expires_at timestamptz,p_outcome text)
returns boolean language plpgsql security invoker set search_path='' as $$
declare j public.otp_delivery_jobs; a public.otp_aliases;
begin
 select * into j from public.otp_delivery_jobs where id=p_job_id and lease_id=p_lease_id and status='processing' for update;
 if not found then return false; end if;
 select * into a from public.otp_aliases where id=j.alias_id for update;
 if a.status='paused' or a.key_id<>p_key_id then
 update public.otp_delivery_jobs set status='done',last_error='alias_changed',lease_id=null where id=j.id; return false;
 end if;
 if p_envelope is not null and p_expires_at>now() and
 ((p_kind='otp' and a.status='active') or (p_kind='setup' and a.status='setup' and a.setup_until>now())) then
 insert into public.otp_codes(id,alias_id,vault_id,credential_id,key_id,kind,envelope,expires_at)
 values(j.id,a.id,a.vault_id,a.credential_id,a.key_id,p_kind,p_envelope,least(p_expires_at,now()+interval '15 minutes')) on conflict do nothing;
 end if;
 update public.otp_aliases set last_received_at=now(),last_status=p_outcome where id=a.id;
 update public.otp_delivery_jobs set status='done',lease_id=null,last_error=null where id=j.id;
 return true;
end $$;
create function public.retry_otp_delivery(p_job_id uuid,p_lease_id uuid,p_error text) returns void language sql security invoker set search_path='' as $$
 update public.otp_delivery_jobs set status=case when attempts>=5 then 'failed' else 'pending' end,
 available_at=now()+interval '15 seconds'*power(2,least(attempts,5)),last_error=left(p_error,60),lease_id=null
 where id=p_job_id and lease_id=p_lease_id and status='processing';
$$;
create function public.cleanup_otp_deliveries() returns void language plpgsql security invoker set search_path='' as $$
begin
 delete from public.otp_codes where expires_at<=now();
 update public.otp_delivery_jobs set status='failed',last_error='delivery_expired',lease_id=null
 where status in ('pending','processing') and (created_at<now()-interval '15 minutes' or (attempts>=5 and locked_until<now()));
 delete from public.otp_delivery_jobs where created_at<now()-interval '24 hours';
 delete from public.otp_receiving_keys k where k.created_at<now()-interval '24 hours'
 and not exists(select 1 from public.otp_aliases a where a.key_id=k.id) and not exists(select 1 from public.otp_codes c where c.key_id=k.id);
end $$;
revoke all on function public.enqueue_otp_delivery(text,uuid,text),public.claim_otp_deliveries(),public.finish_otp_delivery(uuid,uuid,uuid,text,jsonb,timestamptz,text),public.retry_otp_delivery(uuid,uuid,text),public.cleanup_otp_deliveries() from public,anon,authenticated;
grant execute on function public.enqueue_otp_delivery(text,uuid,text),public.claim_otp_deliveries(),public.finish_otp_delivery(uuid,uuid,uuid,text,jsonb,timestamptz,text),public.retry_otp_delivery(uuid,uuid,text),public.cleanup_otp_deliveries() to service_role;

-- Membership loss pauses ingestion; a new receiving key is required before resuming.
create function vault_private.pause_otp_after_member_loss() returns trigger language plpgsql security definer set search_path='' as $$
begin
 delete from public.otp_access where vault_id=old.vault_id and user_id=old.user_id;
 update public.otp_aliases set status='paused',last_status='access_revoked' where vault_id=old.vault_id;
 delete from public.otp_codes where vault_id=old.vault_id;
 return old;
end $$;
revoke all on function vault_private.pause_otp_after_member_loss() from public,anon,authenticated;
create trigger otp_membership_loss after delete on public.vault_members for each row execute function vault_private.pause_otp_after_member_loss();
commit;

