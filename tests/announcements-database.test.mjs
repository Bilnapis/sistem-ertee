import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'

const db = new PGlite()
const uid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const session = (id) => id.replace('8000', '9000')
const chair = uid(1),
  staff = uid(2),
  alice = uid(3),
  bob = uid(4),
  pending = uid(5)
async function asUser(actor, work, role = 'authenticated') {
  return db.transaction(async (tx) => {
    await tx.exec(`set local role ${role}`)
    await tx.query("select set_config('request.jwt.claim.sub',$1,true)", [
      actor,
    ])
    await tx.query("select set_config('request.jwt.claims',$1,true)", [
      JSON.stringify({ session_id: actor ? session(actor) : '' }),
    ])
    return work(tx)
  })
}
async function rpc(actor, name, args) {
  return asUser(
    actor,
    async (tx) =>
      (
        await tx.query(
          `select public.${name}(${args.map((_, i) => `$${i + 1}`).join(',')}) as data`,
          args,
        )
      ).rows[0].data,
  )
}
const future = (hours = 1) =>
  new Date(Date.now() + hours * 3600000).toISOString()
const create = (actor, n, options = {}) =>
  rpc(actor, 'create_announcement', [
    uid(n),
    options.title ?? 'Pengumuman dummy',
    options.description ?? 'Baris pertama.\nBaris kedua.',
    options.starts ?? future(-1),
    options.ends ?? future(1),
  ])
const detail = (actor, id, scope = 'active') =>
  rpc(actor, 'announcement_detail', [id, scope])
const overview = (actor, options = {}) =>
  rpc(actor, 'announcements_overview', [
    options.scope ?? 'active',
    options.search ?? '',
    options.status ?? 'all',
    options.page ?? 1,
    options.size ?? 4,
  ])
const update = (actor, a, options = {}) =>
  rpc(actor, 'update_announcement', [
    a.id,
    options.title ?? a.title,
    options.description ?? a.description,
    options.starts ?? a.starts_at,
    options.ends ?? a.ends_at,
    options.version ?? a.updated_at,
    options.republish ?? false,
  ])
const archive = (actor, a) =>
  rpc(actor, 'archive_announcement', [a.id, a.updated_at])
before(async () => {
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create schema storage;
    create table auth.users(id uuid primary key, email text unique, raw_user_meta_data jsonb default '{}', raw_app_meta_data jsonb default '{}');
    create table auth.sessions(id uuid primary key, user_id uuid references auth.users(id) on delete cascade);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create function auth.jwt() returns jsonb language sql stable as $$ select nullif(current_setting('request.jwt.claims',true),'')::jsonb $$;
    create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects(id bigint generated always as identity, bucket_id text references storage.buckets(id), name text unique, metadata jsonb);
    alter table storage.objects enable row level security;
    grant usage on schema auth, public, storage to anon, authenticated, service_role;
    grant execute on function auth.uid() to authenticated;
    grant select, insert, update, delete on storage.objects to authenticated;
    grant usage on all sequences in schema storage to authenticated;`)
  for (const migration of [
    '20261102000100_resident_auth.sql',
    '20261103000100_resident_management.sql',
    '20261104000100_letter_requests.sql',
    '20261104000200_monthly_dues.sql',
    '20261104000300_complaints.sql',
    '20261105000100_announcements.sql',
    '20261105000200_announcement_conflicts.sql',
    '20261105000300_letters_without_house_block.sql',
    '20261105000400_dues_without_house_block.sql',
    '20261105000500_complaints_without_house_block.sql',
    '20261105000600_remove_resident_house_block.sql',
  ]) {
    await db.exec(
      await readFile(
        new URL(`../supabase/migrations/${migration}`, import.meta.url),
        'utf8',
      ),
    )
  }
  for (let n = 1; n <= 5; n++) {
    await db.query(
      'insert into auth.users(id,email,raw_user_meta_data) values ($1,$2,$3)',
      [
        uid(n),
        `dummy${n}@example.test`,
        JSON.stringify({
          full_name: `Warga Dummy ${n}`,
          nik: String(n).padStart(16, '0'),
          family_card_number: '0000000000000099',
          house_number: String(n),
          phone: '081234567890',
          address: 'Jalan Dummy Nomor 1',
        }),
      ],
    )
    await db.query('insert into auth.sessions values ($1,$2)', [
      session(uid(n)),
      uid(n),
    ])
  }
  await db.query("update public.profiles set role='ketua_rt' where id=$1", [
    chair,
  ])
  await db.query("update public.profiles set role='pengurus_rt' where id=$1", [
    staff,
  ])
})
after(() => db.close())

test('both managers create; active unverified residents read; original request stays private', async () => {
  for (const [actor, n] of [
    [chair, 100],
    [staff, 101],
  ]) {
    const a = await create(actor, n)
    assert.equal(a.created_by, actor)
    assert.equal(a.updated_by, actor)
    assert.equal(a.submitted_payload, undefined)
    for (const reader of [chair, staff, alice, bob, pending]) {
      assert.equal((await detail(reader, a.id)).announcement.id, a.id)
    }
    const raw = await asUser(alice, (tx) =>
      tx.query('select id, title from public.announcements where id=$1', [
        a.id,
      ]),
    )
    assert.equal(raw.rows.length, 1)
    await assert.rejects(
      asUser(alice, (tx) =>
        tx.query(
          'select submitted_payload from public.announcements where id=$1',
          [a.id],
        ),
      ),
      /permission denied/,
    )
  }
})

test('retries return the same record even after edits; changed payload or owner is rejected', async () => {
  const options = { starts: future(-2), ends: future(2) }
  const a = await create(chair, 102, options)
  assert.deepEqual(await create(chair, 102, options), a)
  const changed = await update(staff, a, { title: 'Judul telah diperbaiki' })
  assert.deepEqual(await create(chair, 102, options), changed)
  await assert.rejects(
    create(chair, 102, { ...options, title: 'Beda' }),
    /ANNOUNCEMENT_REQUEST_CONFLICT/,
  )
  await assert.rejects(
    create(staff, 102, options),
    /ANNOUNCEMENT_REQUEST_CONFLICT/,
  )
  assert.equal(
    (
      await db.query(
        'select count(*)::integer as count from public.announcements where id=$1',
        [a.id],
      )
    ).rows[0].count,
    1,
  )
})

test('creation rejects blank, oversized, invalid and already ended schedules', async () => {
  for (const options of [
    { title: '  ' },
    { title: 'a'.repeat(201) },
    { description: '\n\t' },
    { description: 'a'.repeat(2001) },
    { starts: future(3), ends: future(2) },
    { starts: future(-3), ends: future(-2) },
    { starts: 'infinity' },
    { ends: 'infinity' },
  ]) {
    await assert.rejects(
      create(chair, 200, options),
      /INVALID_ANNOUNCEMENT_INPUT|ANNOUNCEMENT_END_PASSED/,
    )
  }
})

test('start is inclusive and end exclusive for overview, detail and direct RLS reads', async () => {
  await db.transaction(async (tx) => {
    for (const [n, start, end] of [
      [210, 'now()', "now() + interval '1 day'"],
      [211, "now() - interval '1 day'", 'now()'],
      [212, "now() + interval '1 day'", "now() + interval '2 days'"],
    ]) {
      await tx.query(
        `insert into public.announcements(id,title,description,starts_at,ends_at,created_by,updated_by,submitted_payload)
        values ($1,$2,'Dummy',${start},${end},$3,$3,'{}')`,
        [uid(n), `Batas ${n}`, chair],
      )
    }
    await tx.exec('set local role authenticated')
    await tx.query(
      "select set_config('request.jwt.claim.sub',$1,true), set_config('request.jwt.claims',$2,true)",
      [pending, JSON.stringify({ session_id: session(pending) })],
    )
    const visible = await tx.query(
      'select id from public.announcements where title like $1',
      ['Batas %'],
    )
    assert.deepEqual(
      visible.rows.map((r) => r.id),
      [uid(210)],
    )
    const list = (
      await tx.query(
        "select public.announcements_overview('active','Batas','all',1,4) as data",
      )
    ).rows[0].data
    assert.deepEqual(
      list.items.map((a) => a.id),
      [uid(210)],
    )
    assert.ok(list.server_now)
    assert.ok(list.next_change_at)
    assert.equal(
      (
        await tx.query(
          "select public.announcement_detail($1,'active') as data",
          [uid(210)],
        )
      ).rows[0].data.announcement.id,
      uid(210),
    )
  })
  for (const n of [211, 212]) {
    await assert.rejects(detail(alice, uid(n)), /ANNOUNCEMENT_NOT_FOUND/)
    await assert.rejects(
      detail(chair, uid(n), 'active'),
      /ANNOUNCEMENT_NOT_FOUND/,
    )
    assert.equal(
      (await detail(staff, uid(n), 'manage')).announcement.id,
      uid(n),
    )
  }
})

test('WIB timestamps are stored as instants, not browser-local times', async () => {
  const a = await create(chair, 220, {
    starts: '2099-11-05T07:30:00+07:00',
    ends: '2099-11-05T08:30:00+07:00',
  })
  assert.equal(Date.parse(a.starts_at), Date.parse('2099-11-05T00:30:00Z'))
  assert.equal(Date.parse(a.ends_at), Date.parse('2099-11-05T01:30:00Z'))
})

test('either manager edits, archives and republishes atomically; stale changes are rejected', async () => {
  const a = await create(chair, 230)
  const b = await update(staff, a, { title: 'Diperbarui pengurus' })
  assert.equal(b.created_by, chair)
  assert.equal(b.updated_by, staff)
  await assert.rejects(
    update(chair, a),
    (error) =>
      error.code === 'PT409' && /STALE_ANNOUNCEMENT/.test(error.message),
  )
  await assert.rejects(
    archive(chair, a),
    (error) =>
      error.code === 'PT409' && /STALE_ANNOUNCEMENT/.test(error.message),
  )
  const c = await archive(chair, b)
  assert.ok(c.archived_at)
  await assert.rejects(detail(alice, c.id), /ANNOUNCEMENT_NOT_FOUND/)
  assert.equal(
    (
      await asUser(alice, (tx) =>
        tx.query('select id from public.announcements where id=$1', [c.id]),
      )
    ).rows.length,
    0,
  )
  await assert.rejects(update(staff, c), /INVALID_ANNOUNCEMENT_ACTION/)
  await assert.rejects(
    update(staff, c, { republish: true, starts: future(-3), ends: future(-2) }),
    /ANNOUNCEMENT_END_PASSED/,
  )
  assert.ok((await detail(staff, c.id, 'manage')).announcement.archived_at)
  const d = await update(staff, c, {
    republish: true,
    title: 'Tayang kembali',
    starts: future(-1),
    ends: future(4),
  })
  assert.equal(d.archived_at, null)
  assert.equal((await detail(alice, d.id)).announcement.title, 'Tayang kembali')
  await assert.rejects(
    update(chair, d, { republish: true }),
    /INVALID_ANNOUNCEMENT_ACTION/,
  )
})

test('ended records may be corrected or rescheduled; there is no automatic archive', async () => {
  const a = (await detail(chair, uid(211), 'manage')).announcement
  const b = await update(staff, a, { title: 'Koreksi pengumuman selesai' })
  assert.equal(b.archived_at, null)
  await assert.rejects(detail(alice, a.id), /ANNOUNCEMENT_NOT_FOUND/)
  const c = await update(chair, b, { ends: future(2) })
  assert.equal((await detail(alice, c.id)).announcement.id, c.id)
})

test('search, status, ordering and pagination operate before slicing', async () => {
  for (let n = 300; n < 307; n++)
    await create(chair, n, {
      title: `Kegiatan ${n}`,
      starts: '2098-01-01T00:00:00Z',
      ends: '2098-01-02T00:00:00Z',
    })
  const list = await overview(staff, {
    scope: 'manage',
    search: 'KEGIATAN',
    status: 'scheduled',
  })
  assert.equal(list.total, 7)
  assert.deepEqual(
    list.items.map((a) => a.id),
    [300, 301, 302, 303].map(uid),
  )
  assert.equal(
    (await overview(staff, { scope: 'manage', search: 'Kegiatan', page: 2 }))
      .items.length,
    3,
  )
  assert.equal(
    (await overview(staff, { scope: 'manage', search: 'Kegiatan', size: 3 }))
      .items.length,
    3,
  )
  assert.equal((await overview(alice, { search: 'Kegiatan' })).total, 0)
  assert.equal(
    (
      await overview(staff, { scope: 'manage', status: 'archived' })
    ).items.every((a) => a.archived_at),
    true,
  )
  for (const options of [
    { scope: 'other' },
    { status: 'draft' },
    { page: 0 },
    { size: 100 },
    { search: 'a'.repeat(201) },
  ])
    await assert.rejects(overview(chair, options), /INVALID_ANNOUNCEMENT_INPUT/)
})

test('residents cannot manage through RPC, direct writes, or a fabricated scope', async () => {
  const a = await create(chair, 400)
  await assert.rejects(create(alice, 401), /ACCESS_DENIED/)
  await assert.rejects(update(alice, a), /ACCESS_DENIED/)
  await assert.rejects(archive(alice, a), /ACCESS_DENIED/)
  await assert.rejects(overview(alice, { scope: 'manage' }), /ACCESS_DENIED/)
  await assert.rejects(detail(alice, a.id, 'manage'), /ACCESS_DENIED/)
  for (const sql of [
    "update public.announcements set title='x'",
    'delete from public.announcements',
    'insert into public.announcements(id) values (gen_random_uuid())',
  ])
    await assert.rejects(
      asUser(alice, (tx) => tx.exec(sql)),
      /permission denied/,
    )
  for (const name of [
    'announcements_overview',
    'announcement_detail',
    'create_announcement',
    'update_announcement',
    'archive_announcement',
  ]) {
    const privilege = await db.query(
      "select has_function_privilege('anon', p.oid, 'execute') as allowed from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname=$1",
      [name],
    )
    assert.equal(privilege.rows[0].allowed, false)
  }
})

test('inactive, archived and revoked sessions cannot read or write announcements', async () => {
  const a = await create(chair, 410)
  await db.query('update public.profiles set is_active=false where id=$1', [
    bob,
  ])
  await assert.rejects(overview(bob), /ACCESS_DENIED/)
  await assert.rejects(detail(bob, a.id), /ACCESS_DENIED/)
  await db.query('update public.profiles set archived_at=now() where id=$1', [
    bob,
  ])
  await assert.rejects(overview(bob), /ACCESS_DENIED/)
  await db.query('delete from auth.sessions where user_id=$1', [staff])
  await assert.rejects(overview(staff), /ACCESS_DENIED/)
  await assert.rejects(create(staff, 411), /ACCESS_DENIED/)
  await assert.rejects(detail('', a.id), /ACCESS_DENIED/)
})
