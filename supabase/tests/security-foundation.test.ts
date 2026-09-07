import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { uuid_ossp } from '@electric-sql/pglite/contrib/uuid_ossp';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';

const A = '00000000-0000-4000-8000-000000000001';
const B = '00000000-0000-4000-8000-000000000002';
const C = '00000000-0000-4000-8000-000000000003';
const wrapped = Buffer.alloc(48, 1).toString('base64');
const nonce = Buffer.alloc(12, 2).toString('base64');

// Execute the same assertions against both known schema histories.
describe.each([
  'supabase/migrations/20260826000000_init_schema.sql',
  'sql/00_all_tables_complete.sql',
])('Security Foundation over %s', (baseline) => {
  let db: PGlite;
  let vault: string;
  let family: string;
  let credential: string;
  const rows = async (sql: string) => (await db.query(sql)).rows;
  const asUser = async (id: string, role = 'authenticated') => {
    await db.exec('RESET ROLE');
    await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [id]);
    await db.exec(`SET ROLE ${role}`);
  };
  const create = async () => {
    const result = await db.query<{ id: string }>(
      'SELECT public.create_owned_vault($1, $2, $3, $4) AS id',
      ['Shared', 'SHARED', wrapped, nonce],
    );
    return result.rows[0].id;
  };
  const denied = async (sql: string) => {
    await expect(db.query(sql)).rejects.toMatchObject({ code: '42501' });
  };

  beforeAll(async () => {
    db = new PGlite({ extensions: { uuid_ossp, pgcrypto } });
    // Minimal Supabase Auth contract; real Postgres roles, grants, RLS and triggers.
    await db.exec(`
      CREATE ROLE anon NOLOGIN;
      CREATE ROLE authenticated NOLOGIN;
      CREATE SCHEMA auth;
      CREATE TABLE auth.users (id uuid PRIMARY KEY);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
        $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS
        $$ SELECT current_user::text $$;
      GRANT USAGE ON SCHEMA public, auth TO anon, authenticated;
      INSERT INTO auth.users VALUES ('${A}'), ('${B}'), ('${C}');
    `);
    await db.exec(readFileSync(baseline, 'utf8'));
    // Reproduce historical broad table grants and an unknown stale permissive policy.
    await db.exec(`GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
      CREATE POLICY stale_allow ON public.vaults FOR ALL USING (true) WITH CHECK (true);`);
    await db.exec(readFileSync('supabase/migrations/20260907032815_security_foundation.sql', 'utf8'));
    await db.exec(readFileSync('supabase/migrations/20260907033211_close_unsafe_otp_and_harden_profiles.sql', 'utf8'));
    await asUser(A);
    vault = await create();
    family = (await db.query<{ id: string }>(
      `INSERT INTO public.families(name, created_by) VALUES ('Family', '${A}') RETURNING id`,
    )).rows[0].id;
    await db.exec(`INSERT INTO public.family_members(family_id, user_id, role)
      VALUES ('${family}', '${A}', 'OWNER')`);
    credential = (await db.query<{ id: string }>(`
      INSERT INTO public.credentials(vault_id, created_by, encrypted_payload, nonce)
      VALUES ('${vault}', '${A}', 'ciphertext', 'nonce') RETURNING id`,
    )).rows[0].id;
  }, 30000);

  afterAll(async () => { await db?.close(); });

  it('closes every client OTP operation, even for authenticated users', async () => {
    for (const role of ['anon', 'authenticated']) {
      await asUser(B, role);
      await denied('SELECT * FROM public.verification_codes');
      await denied("INSERT INTO public.verification_codes(service_name,code) VALUES ('fake','123456')");
      await denied("UPDATE public.verification_codes SET code='999999'");
      await denied('DELETE FROM public.verification_codes');
    }
  });

  it('isolates profiles and crypto metadata while allowing owner updates', async () => {
    await asUser(A);
    await db.exec(`INSERT INTO public.profiles(id,display_name) VALUES ('${A}','A');
      INSERT INTO public.user_crypto(user_id,encrypted_user_key,user_key_nonce,kdf_salt,kdf_parameters)
      VALUES ('${A}','cipher','nonce','salt','{}')`);
    await asUser(B);
    expect(await rows('SELECT * FROM public.profiles')).toEqual([]);
    expect(await rows('SELECT * FROM public.user_crypto')).toEqual([]);
    expect(await rows("UPDATE public.user_crypto SET encrypted_user_key='attack' RETURNING user_id")).toEqual([]);
    await denied(`INSERT INTO public.profiles(id,display_name) VALUES ('${A}','fake')`);
    await asUser(A);
    expect(await rows("UPDATE public.profiles SET display_name='updated' RETURNING id")).toHaveLength(1);
    expect(await rows("UPDATE public.user_crypto SET encrypted_user_key='rotated' RETURNING user_id")).toHaveLength(1);
    await denied(`UPDATE public.user_crypto SET user_id='${B}'`);
    await denied(`UPDATE public.profiles SET id='${B}'`);
  });

  it('blocks discovery, self-enrollment, role escalation and cross-user writes', async () => {
    await asUser(B);
    expect(await rows('SELECT * FROM public.vaults')).toEqual([]);
    expect(await rows('SELECT * FROM public.vault_members')).toEqual([]);
    expect(await rows('SELECT * FROM public.credentials')).toEqual([]);
    expect(await rows('SELECT * FROM public.families')).toEqual([]);
    expect(await rows('SELECT * FROM public.family_members')).toEqual([]);
    for (const permission of ['READ', 'WRITE', 'ADMIN']) {
      await denied(`INSERT INTO public.vault_members(vault_id,user_id,encrypted_vault_key,nonce,permissions)
        VALUES ('${vault}','${B}','fake','fake','${permission}')`);
    }
    for (const role of ['OWNER', 'ADMIN', 'MEMBER']) {
      await denied(`INSERT INTO public.family_members(family_id,user_id,role)
        VALUES ('${family}','${B}','${role}')`);
    }
    await denied(`UPDATE public.vault_members SET permissions='ADMIN' WHERE vault_id='${vault}'`);
    await denied(`UPDATE public.family_members SET role='OWNER' WHERE family_id='${family}'`);
    await denied(`INSERT INTO public.credentials(vault_id,created_by,encrypted_payload,nonce)
      VALUES ('${vault}','${B}','fake','fake')`);
    expect(await rows(`UPDATE public.credentials SET encrypted_payload='attack' WHERE id='${credential}' RETURNING id`)).toEqual([]);
    expect(await rows(`DELETE FROM public.credentials WHERE id='${credential}' RETURNING id`)).toEqual([]);
    expect(await rows(`UPDATE public.vaults SET name='attack' WHERE id='${vault}' RETURNING id`)).toEqual([]);
    expect(await rows(`DELETE FROM public.vaults WHERE id='${vault}' RETURNING id`)).toEqual([]);
  });

  it('allows owner CRUD but protects identity, attribution, and existing wrappers', async () => {
    await asUser(A);
    expect(await rows('SELECT * FROM public.vaults')).toHaveLength(1);
    expect(await rows('SELECT * FROM public.vault_members')).toHaveLength(1);
    expect(await rows(`UPDATE public.credentials SET encrypted_payload='updated' WHERE id='${credential}' RETURNING id`)).toHaveLength(1);
    expect(await rows(`UPDATE public.vaults SET name='renamed' WHERE id='${vault}' RETURNING id`)).toHaveLength(1);
    await denied(`UPDATE public.vaults SET owner_user_id='${B}' WHERE id='${vault}'`);
    await denied(`UPDATE public.vaults SET family_id='${family}' WHERE id='${vault}'`);
    await denied(`UPDATE public.credentials SET created_by='${B}' WHERE id='${credential}'`);
    await denied(`UPDATE public.credentials SET vault_id='${vault}' WHERE id='${credential}'`);
    await denied(`UPDATE public.vault_members SET encrypted_vault_key='replacement' WHERE vault_id='${vault}'`);
    await denied(`DELETE FROM public.vault_members WHERE vault_id='${vault}'`);
    await denied(`INSERT INTO public.credentials(vault_id,created_by,encrypted_payload,nonce)
      VALUES ('${vault}','${B}','fake','fake')`);
  });

  it('preserves READ/WRITE access without allowing membership administration', async () => {
    await db.exec('RESET ROLE');
    // Trusted fixture models members enrolled before this release, with an actual shared key.
    await db.exec(`INSERT INTO public.vault_members(vault_id,user_id,encrypted_vault_key,nonce,permissions)
      VALUES ('${vault}','${B}','wrapped-B','nonce-B','READ'),
             ('${vault}','${C}','wrapped-C','nonce-C','WRITE')`);
    await asUser(B);
    expect(await rows('SELECT * FROM public.vaults')).toHaveLength(1);
    expect(await rows('SELECT * FROM public.credentials')).toHaveLength(1);
    expect(await rows('SELECT * FROM public.vault_members')).toMatchObject([{ user_id: B }]);
    await denied(`INSERT INTO public.credentials(vault_id,created_by,encrypted_payload,nonce)
      VALUES ('${vault}','${B}','fake','fake')`);
    expect(await rows(`UPDATE public.credentials SET encrypted_payload='attack' RETURNING id`)).toEqual([]);
    expect(await rows('DELETE FROM public.credentials RETURNING id')).toEqual([]);
    await denied(`UPDATE public.vault_members SET permissions='ADMIN' WHERE user_id='${B}'`);
    await asUser(C);
    expect(await rows(`UPDATE public.credentials SET encrypted_payload='writer' WHERE id='${credential}' RETURNING id`)).toHaveLength(1);
    const inserted = await rows(`INSERT INTO public.credentials(vault_id,created_by,encrypted_payload,nonce)
      VALUES ('${vault}','${C}','writer','nonce') RETURNING id`);
    expect(inserted).toHaveLength(1);
    expect(await rows(`DELETE FROM public.credentials WHERE created_by='${C}' RETURNING id`)).toHaveLength(1);
    expect(await rows(`DELETE FROM public.vaults WHERE id='${vault}' RETURNING id`)).toEqual([]);
    await asUser(A);
    await denied(`UPDATE public.vaults SET type='PERSONAL' WHERE id='${vault}'`);
  });

  it('rejects anonymous and missing-identity callers, including the private implementation', async () => {
    await asUser('', 'anon');
    for (const table of ['vaults', 'vault_members', 'credentials', 'families', 'family_members']) {
      await denied(`SELECT * FROM public.${table}`);
    }
    await expect(create()).rejects.toMatchObject({ code: '42501' });
    await denied(`SELECT vault_private.create_owned_vault('x','SHARED','${wrapped}','${nonce}')`);
    await asUser('');
    await expect(create()).rejects.toMatchObject({ code: '42501' });
  });

  it('rolls back the vault if inserting the owner wrapper fails', async () => {
    await db.exec(`RESET ROLE;
      CREATE FUNCTION public.test_reject_member() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN RAISE EXCEPTION 'simulated membership failure'; END $$;
      CREATE TRIGGER test_reject_member BEFORE INSERT ON public.vault_members
        FOR EACH ROW EXECUTE FUNCTION public.test_reject_member();`);
    try {
      await asUser(B);
      await expect(create()).rejects.toThrow('simulated membership failure');
      expect(await rows(`SELECT * FROM public.vaults WHERE owner_user_id='${B}'`)).toEqual([]);
    } finally {
      await db.exec(`RESET ROLE;
        DROP TRIGGER test_reject_member ON public.vault_members;
        DROP FUNCTION public.test_reject_member();`);
    }
  });

  it('rolls back invalid creation and creates an isolated owner membership for B', async () => {
    await asUser(B);
    await expect(db.query(`SELECT public.create_owned_vault('bad','SHARED','short','${nonce}')`)).rejects.toBeDefined();
    expect(await rows(`SELECT * FROM public.vaults WHERE owner_user_id='${B}'`)).toEqual([]);
    const own = await create();
    expect(await rows(`SELECT user_id, permissions FROM public.vault_members WHERE vault_id='${own}'`))
      .toEqual([{ user_id: B, permissions: 'ADMIN' }]);
    await asUser(A);
    expect(await rows(`SELECT * FROM public.vaults WHERE id='${own}'`)).toEqual([]);
    await asUser(B);
    expect(await rows(`DELETE FROM public.vaults WHERE id='${own}' RETURNING id`)).toHaveLength(1);
    expect(await rows(`SELECT * FROM public.vault_members WHERE vault_id='${own}'`)).toEqual([]);
  });
});
