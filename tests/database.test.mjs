import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'

const db = new PGlite()
const alice = '00000000-0000-4000-8000-000000000001'
const bob = '00000000-0000-4000-8000-000000000002'
const sessionFor = id => id.replace('8000', '9000')
const metadata = (nik, extra = {}) => ({ full_name: 'Warga Uji', nik, phone: '081234567890', address: 'Jalan Dummy Nomor 1', house_block: 'UJI-A1', ...extra })

async function addUser(id, nik, extra) {
  await db.query('insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)', [id, `${id}@example.test`, JSON.stringify(metadata(nik, extra))])
  await db.query('insert into auth.sessions (id, user_id) values ($1, $2)', [sessionFor(id), id])
}

async function asUser(id, callback, role = 'authenticated') {
  return db.transaction(async tx => {
    await tx.exec(`set local role ${role}`)
    await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [id])
    await tx.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ session_id: id ? sessionFor(id) : '' })])
    return callback(tx)
  })
}

before(async () => {
  // Minimal Auth contract for executing the real migration in PostgreSQL/WASM.
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth;
    create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
    create table auth.sessions (id uuid primary key, user_id uuid references auth.users(id) on delete cascade);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create function auth.jwt() returns jsonb language sql stable as
      $$ select nullif(current_setting('request.jwt.claims', true), '')::jsonb $$;
    grant usage on schema auth, public to anon, authenticated, service_role;
    grant execute on function auth.uid() to authenticated;`)
  await db.exec(await readFile(new URL('../supabase/migrations/20261102000100_resident_auth.sql', import.meta.url), 'utf8'))
  await addUser(alice, '0000000000000001', { role: 'ketua_rt', is_active: false, verification_status: 'terverifikasi' })
  await addUser(bob, '0000000000000002')
})
after(() => db.close())

test('signup forces warga, active account, and pending verification despite hostile metadata', async () => {
  const { rows: [profile] } = await db.query('select * from public.profiles where id = $1', [alice])
  assert.equal(profile.role, 'warga')
  assert.equal(profile.is_active, true)
  assert.equal(profile.verification_status, 'menunggu_verifikasi')
})

test('authenticated resident reads only own profile, including direct ID queries', async () => {
  const { rows } = await asUser(alice, tx => tx.query('select id from public.profiles'))
  assert.deepEqual(rows, [{ id: alice }])
  const other = await asUser(alice, tx => tx.query('select * from public.profiles where id = $1', [bob]))
  assert.equal(other.rows.length, 0)
})

test('anonymous and logged-out requests cannot read private profiles', async () => {
  await assert.rejects(asUser('', tx => tx.query('select * from public.profiles'), 'anon'), /permission denied/)
  assert.equal((await asUser('', tx => tx.query('select * from public.profiles'))).rows.length, 0)
})

test('resident cannot change role, verification, status, or another profile', async () => {
  for (const statement of [
    "update public.profiles set role = 'ketua_rt'",
    "update public.profiles set verification_status = 'terverifikasi'",
    'update public.profiles set is_active = true',
    "update public.profiles set full_name = 'Changed'",
    'delete from public.profiles',
  ]) await assert.rejects(asUser(alice, tx => tx.exec(statement)), /permission denied/)
  await assert.rejects(asUser(alice, tx => tx.exec('select app_private.handle_new_user()')), /permission denied/)
})

test('disabled accounts lose all profile access with their existing identity', async () => {
  await db.query('update public.profiles set is_active = false where id = $1', [bob])
  assert.equal((await asUser(bob, tx => tx.query('select * from public.profiles'))).rows.length, 0)
  await db.query('update public.profiles set is_active = true where id = $1', [bob])
})

test('a revoked session cannot reuse its still-unexpired JWT to read profiles', async () => {
  await db.query('delete from auth.sessions where user_id = $1', [bob])
  assert.equal((await asUser(bob, tx => tx.query('select * from public.profiles'))).rows.length, 0)
  await db.query('insert into auth.sessions (id, user_id) values ($1, $2)', [sessionFor(bob), bob])
})

test('duplicate NIK rolls back Auth user and profile creation together', async () => {
  const id = '00000000-0000-4000-8000-000000000003'
  await assert.rejects(addUser(id, '0000000000000001'), /unique constraint/)
  assert.equal((await db.query('select id from auth.users where id = $1', [id])).rows.length, 0)
})

test('database validates required identity independently of the browser', async () => {
  const id = '00000000-0000-4000-8000-000000000004'
  for (const extra of [{ full_name: '' }, { nik: '123' }, { phone: 'abc' }, { address: '' }, { house_block: '' }]) {
    await assert.rejects(addUser(id, '0000000000000004', extra), /check constraint/)
  }
})

test('profile corrections reset verification; auth email changes synchronize', async () => {
  await db.query("update public.profiles set verification_status = 'terverifikasi' where id = $1", [alice])
  await db.query("update public.profiles set address = 'Jalan Dummy Baru 2' where id = $1", [alice])
  await db.query("update auth.users set email = 'updated@example.test' where id = $1", [alice])
  const { rows: [profile] } = await db.query('select * from public.profiles where id = $1', [alice])
  assert.equal(profile.verification_status, 'menunggu_verifikasi')
  assert.equal(profile.email, 'updated@example.test')
})
