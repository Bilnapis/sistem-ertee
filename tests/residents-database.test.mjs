import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'

const db = new PGlite()
const uid = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const chair = uid(1), staff = uid(2), alice = uid(3), bob = uid(4), legacy = uid(5)
let legacyBeforeMigration, legacyEventsBeforeMigration
const session = id => id.replace('8000', '9000')
const identity = n => ({ full_name: `Warga Dummy ${n}`, nik: String(n).padStart(16, '0'), family_card_number: '0000000000000099',
  gender: 'laki_laki', marital_status: 'belum_menikah', phone: '081234567890', address: 'Jalan Dummy Nomor 1' })
async function addUser(n, metadata = identity(n), app = {}) {
  await db.query('insert into auth.users(id, email, raw_user_meta_data, raw_app_meta_data) values ($1,$2,$3,$4)', [uid(n), `warga${n}@example.test`, JSON.stringify(metadata), JSON.stringify(app)])
  await db.query('insert into auth.sessions(id,user_id) values ($1,$2)', [session(uid(n)), uid(n)])
}
async function asUser(id, work, role = 'authenticated') {
  return db.transaction(async tx => {
    await tx.exec(`set local role ${role}`)
    await tx.query("select set_config('request.jwt.claim.sub',$1,true)", [id])
    await tx.query("select set_config('request.jwt.claims',$1,true)", [JSON.stringify({ session_id: id ? session(id) : '' })])
    return work(tx)
  })
}
const get = async id => (await db.query('select * from public.profiles where id=$1', [id])).rows[0]
const update = async (actor, id, fields, version) => asUser(actor, tx => tx.query('select * from public.update_resident($1,$2,$3)', [id, JSON.stringify(fields), version]))
const review = async (actor, id, status, note = '') => {
  const version = (await get(id)).updated_at
  return asUser(actor, tx => tx.query('select * from public.review_resident($1,$2,$3,$4)', [id, status, note, version]))
}
const archive = async (id, value) => {
  const version = (await get(id)).updated_at
  return asUser(chair, tx => tx.query('select * from public.set_resident_archive($1,$2,$3)', [id, value, version]))
}

before(async () => {
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth;
    create table auth.users(id uuid primary key, email text unique, raw_user_meta_data jsonb default '{}', raw_app_meta_data jsonb default '{}');
    create table auth.sessions(id uuid primary key, user_id uuid references auth.users(id) on delete cascade);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create function auth.jwt() returns jsonb language sql stable as $$ select nullif(current_setting('request.jwt.claims',true),'')::jsonb $$;
    grant usage on schema auth, public to anon, authenticated, service_role;
    grant execute on function auth.uid() to authenticated;`)
  for (const migration of ['20261102000100_resident_auth.sql', '20261103000100_resident_management.sql']) {
    await db.exec(await readFile(new URL(`../supabase/migrations/${migration}`, import.meta.url), 'utf8'))
  }
  const old = identity(5); delete old.family_card_number; delete old.gender; delete old.marital_status
  await addUser(5, { ...old, house_block: 'DUMMY-LEGACY', house_number: 'DUMMY-REMOVED' })
  await db.query("update public.profiles set verification_status='terverifikasi' where id=$1", [legacy])
  legacyBeforeMigration = await get(legacy)
  legacyEventsBeforeMigration = (await db.query('select * from public.resident_events where profile_id=$1 order by id', [legacy])).rows
  await db.exec(await readFile(new URL('../supabase/migrations/20261105000600_remove_resident_house_block.sql', import.meta.url), 'utf8'))
  await db.exec(await readFile(new URL('../supabase/migrations/20261105001000_remove_resident_house_number.sql', import.meta.url), 'utf8'))
  for (let i = 1; i <= 4; i++) await addUser(i)
  await db.query("update public.profiles set role='ketua_rt' where id=$1", [chair])
  await db.query("update public.profiles set role='pengurus_rt' where id=$1", [staff])
})
after(() => db.close())

test('removing house blocks and numbers preserves other resident data and supports signup without the fields', async () => {
  const { house_block, house_number, ...expected } = legacyBeforeMigration
  assert.equal(house_block, 'DUMMY-LEGACY')
  assert.deepEqual(await get(legacy), expected)
  assert.deepEqual((await db.query('select * from public.resident_events where profile_id=$1 order by id', [legacy])).rows, legacyEventsBeforeMigration)
  assert.equal((await db.query("select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='house_block'")).rows.length, 0)
  assert.equal((await get(alice)).house_block, undefined)
  assert.equal(house_number, 'DUMMY-REMOVED')
  assert.equal((await db.query("select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='house_number'")).rows.length, 0)
  assert.equal(Object.hasOwn(await get(alice), 'house_number'), false)
})

test('both manager roles can read directory and update any resident equally', async () => {
  for (const actor of [chair, staff]) {
    const access = await asUser(actor, tx => tx.query('select public.resident_management_access() as allowed'))
    assert.equal(access.rows[0].allowed, true)
    assert.equal((await asUser(actor, tx => tx.query('select id from public.profiles'))).rows.length, 5)
    await update(actor, bob, { ...identity(4), address: actor === chair ? 'Alamat Dummy Ketua' : 'Alamat Dummy Pengurus' }, (await get(bob)).updated_at)
  }
})

test('residents cannot read another household member or call manager RPCs', async () => {
  assert.deepEqual((await asUser(alice, tx => tx.query('select id from public.profiles'))).rows, [{ id: alice }])
  assert.equal((await asUser(alice, tx => tx.query('select * from public.profiles where id=$1', [bob]))).rows.length, 0)
  for (const statement of ['select public.list_residents()', 'select public.resident_summary()']) {
    await assert.rejects(asUser(alice, tx => tx.query(statement)), /ACCESS_DENIED/)
  }
  await assert.rejects(update(alice, bob, identity(4), (await get(bob)).updated_at), /ACCESS_DENIED/)
  await assert.rejects(review(alice, alice, 'terverifikasi'), /ACCESS_DENIED/)
  await assert.rejects(asUser('', tx => tx.query('select public.list_residents()'), 'anon'), /permission denied/)
})

test('self updates use a field allowlist and reset identity verification', async () => {
  await review(chair, alice, 'terverifikasi')
  for (const extra of [{ role: 'ketua_rt' }, { is_active: true }, { verification_status: 'terverifikasi' }, { reviewed_by: alice }, { email: 'fake@example.test' }, { archived_at: null }, { house_block: 'DUMMY-A' }, { house_number: 'DUMMY-REMOVED' }]) {
    await assert.rejects(update(alice, alice, { ...identity(3), ...extra }, (await get(alice)).updated_at), /ACCESS_DENIED/)
  }
  await update(alice, alice, { ...identity(3), address: 'Alamat Dummy Berubah' }, (await get(alice)).updated_at)
  const result = await get(alice)
  assert.equal(result.verification_status, 'menunggu_verifikasi')
  assert.equal(result.reviewed_by, null)
  assert.equal(result.reviewed_at, null)
  assert.equal(result.role, 'warga')
})

test('incomplete legacy records remain readable but cannot be verified until completed', async () => {
  assert.equal((await get(legacy)).family_card_number, null)
  await update(chair, legacy, { is_active: false }, (await get(legacy)).updated_at)
  await update(chair, legacy, { is_active: true }, (await get(legacy)).updated_at)
  await assert.rejects(review(staff, legacy, 'terverifikasi'), /INCOMPLETE_PROFILE/)
  await update(legacy, legacy, identity(5), (await get(legacy)).updated_at)
  await review(staff, legacy, 'terverifikasi')
  assert.equal((await get(legacy)).reviewed_by, staff)
})

test('correction requests require a reason and record reviewer, time, and immutable history', async () => {
  await assert.rejects(review(chair, alice, 'perlu_perbaikan', '  '), /REVIEW_NOTE_REQUIRED/)
  await review(staff, alice, 'perlu_perbaikan', 'Periksa nomor KK dummy.')
  const profile = await get(alice)
  assert.equal(profile.review_note, 'Periksa nomor KK dummy.')
  assert.equal(profile.reviewed_by, staff)
  assert.ok(profile.reviewed_at)
  const history = await asUser(alice, tx => tx.query("select * from public.resident_events where profile_id=$1 and details->>'note'=$2", [alice, profile.review_note]))
  assert.equal(history.rows.length, 1)
  assert.equal(history.rows[0].actor_name, 'Warga Dummy 2')
  assert.equal((await asUser(bob, tx => tx.query('select * from public.resident_events where profile_id=$1', [alice]))).rows.length, 0)
  await assert.rejects(asUser(alice, tx => tx.exec('delete from public.resident_events')), /permission denied/)
})

test('stale edits and reviews cannot overwrite newer changes', async () => {
  const old = await get(bob)
  await update(chair, bob, { ...identity(4), address: 'Alamat Dummy Terbaru' }, old.updated_at)
  await assert.rejects(update(staff, bob, identity(4), old.updated_at), /STALE_PROFILE/)
  await assert.rejects(asUser(staff, tx => tx.query('select * from public.review_resident($1,$2,$3,$4)', [bob, 'terverifikasi', '', old.updated_at])), /STALE_PROFILE/)
})

test('NIK uniqueness, KK sharing, and validation are enforced independently of UI', async () => {
  await assert.rejects(update(chair, bob, { ...identity(4), nik: identity(3).nik }, (await get(bob)).updated_at), /unique constraint/)
  for (const fields of [{ nik: '123' }, { phone: 'abc' }, { family_card_number: '123' }, { gender: 'invalid' }, { full_name: '' }]) {
    await assert.rejects(update(chair, bob, { ...identity(4), ...fields }, (await get(bob)).updated_at), /constraint/)
  }
  assert.equal((await get(alice)).family_card_number, (await get(bob)).family_card_number)
})

test('archive preserves data/history and blocks access; restore requires explicit activation', async () => {
  await archive(bob, true)
  assert.ok((await get(bob)).archived_at)
  assert.equal((await get(bob)).is_active, false)
  assert.equal((await asUser(bob, tx => tx.query('select * from public.profiles'))).rows.length, 0)
  await assert.rejects(update(bob, bob, identity(4), (await get(bob)).updated_at), /ACCESS_DENIED/)
  await assert.rejects(update(chair, bob, identity(4), (await get(bob)).updated_at), /RESIDENT_ARCHIVED/)
  await archive(bob, false)
  assert.equal((await get(bob)).archived_at, null)
  assert.equal((await get(bob)).is_active, false)
  await update(chair, bob, { ...identity(4), is_active: true }, (await get(bob)).updated_at)
  assert.equal((await asUser(bob, tx => tx.query('select id from public.profiles'))).rows.length, 1)
  const history = await db.query("select action from public.resident_events where profile_id=$1 and action in ('archived','restored') order by id", [bob])
  assert.deepEqual(history.rows.map(row => row.action), ['archived', 'restored'])
})

test('disabled managers and revoked sessions lose privilege with an existing JWT', async () => {
  await update(chair, staff, { is_active: false }, (await get(staff)).updated_at)
  assert.equal((await asUser(staff, tx => tx.query('select * from public.profiles'))).rows.length, 0)
  await assert.rejects(asUser(staff, tx => tx.query('select public.list_residents()')), /ACCESS_DENIED/)
  await update(chair, staff, { is_active: true }, (await get(staff)).updated_at)
  await db.query('delete from auth.sessions where user_id=$1', [staff])
  await assert.rejects(asUser(staff, tx => tx.query('select public.resident_summary()')), /ACCESS_DENIED/)
  await db.query('insert into auth.sessions values ($1,$2)', [session(staff), staff])
})

test('public signup ignores forged role, status, and provisioning metadata', async () => {
  await addUser(6, { ...identity(6), role: 'ketua_rt', is_active: false, verification_status: 'terverifikasi', ertee_creation: { actor_id: chair } })
  const profile = await get(uid(6))
  assert.equal(profile.role, 'warga')
  assert.equal(profile.is_active, true)
  assert.equal(profile.verification_status, 'menunggu_verifikasi')
})

test('trusted server provisioning atomically creates role and profile, rechecking the live manager', async () => {
  const trusted = { ertee_creation: { actor_id: chair, session_id: session(chair), role: 'pengurus_rt', is_active: false } }
  await addUser(7, identity(7), trusted)
  assert.equal((await get(uid(7))).role, 'pengurus_rt')
  assert.equal((await get(uid(7))).is_active, false)
  assert.equal((await get(uid(7))).created_by, chair)
  await assert.rejects(addUser(8, { ...identity(8), nik: identity(3).nik }, trusted), /unique constraint/)
  assert.equal((await db.query('select id from auth.users where id=$1', [uid(8)])).rows.length, 0)
  await assert.rejects(addUser(8, { ...identity(8), family_card_number: '' }, trusted), /INCOMPLETE_PROFILE/)
  assert.equal((await db.query('select id from auth.users where id=$1', [uid(8)])).rows.length, 0)
  await assert.rejects(addUser(8, identity(8), { ertee_creation: { ...trusted.ertee_creation, actor_id: alice, session_id: session(alice) } }), /ACCESS_DENIED/)
})

test('directory filters and stable pagination return real counts without wildcard injection', async () => {
  for (let i = 10; i <= 21; i++) await addUser(i)
  const list = async (search = '', status = 'all', role = 'all', verification = 'all', sort = 'newest', page = 1) =>
    (await asUser(chair, tx => tx.query('select public.list_residents($1,$2,$3,$4,$5,$6) as result', [search, status, role, verification, sort, page]))).rows[0].result
  const first = await list(), second = await list('', 'all', 'all', 'all', 'newest', 2)
  assert.equal(first.items.length, 10)
  assert.equal(first.total, 19)
  assert.ok(second.items.every(item => !first.items.find(previous => previous.id === item.id)))
  assert.equal((await list('Warga Dummy 21')).items[0].id, uid(21))
  assert.equal((await list(identity(3).nik)).items[0].id, alice)
  assert.equal((await list('DUMMY-REMOVED')).total, 0)
  assert.equal((await list('%')).total, 0)
  assert.equal((await list('', 'inactive')).items[0].id, uid(7))
  assert.equal((await list('', 'all', 'ketua_rt')).items[0].id, chair)
  const summary = (await asUser(staff, tx => tx.query('select public.resident_summary() as result'))).rows[0].result
  assert.equal(summary.total, first.total)
  assert.equal(summary.total, summary.menunggu_verifikasi + summary.terverifikasi + summary.perlu_perbaikan)
  await assert.rejects(list('', 'invalid'), /INVALID_INPUT/)
})

test('competing manager demotions leave one active manager and deny removing the last', async () => {
  const chairVersion = (await get(chair)).updated_at, staffVersion = (await get(staff)).updated_at
  const results = await Promise.allSettled([
    update(chair, chair, { role: 'warga' }, chairVersion),
    update(staff, staff, { role: 'warga' }, staffVersion),
  ])
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1)
  assert.match(String(results.find(result => result.status === 'rejected').reason), /LAST_ACTIVE_MANAGER/)
  const managers = (await db.query("select * from public.profiles where is_active and archived_at is null and role in ('ketua_rt','pengurus_rt')")).rows
  assert.equal(managers.length, 1)
  const last = managers[0]
  await assert.rejects(update(last.id, last.id, { is_active: false }, last.updated_at), /LAST_ACTIVE_MANAGER/)
  await assert.rejects(asUser(last.id, tx => tx.query('select * from public.set_resident_archive($1,true,$2)', [last.id, last.updated_at])), /LAST_ACTIVE_MANAGER/)
  await db.query("update public.profiles set role='ketua_rt' where id=$1", [chair])
  await db.query("update public.profiles set role='pengurus_rt' where id=$1", [staff])
})
