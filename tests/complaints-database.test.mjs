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
const submit = (
  actor,
  n,
  title = 'Lampu jalan dummy',
  category = 'fasilitas_umum',
  description = 'Lampu jalan dummy tidak menyala.',
) => rpc(actor, 'submit_complaint', [uid(n), title, description, category])
const detail = (actor, id, scope = 'mine') =>
  rpc(actor, 'complaint_detail', [id, scope])
const review = (actor, complaint, action, note = '', category = null) =>
  rpc(actor, 'review_complaint', [
    complaint.id,
    action,
    category,
    note,
    complaint.updated_at,
  ])
const overview = (actor, options = {}) =>
  rpc(actor, 'complaints_overview', [
    options.scope ?? 'mine',
    options.search ?? '',
    options.category ?? 'all',
    options.status ?? 'all',
    options.from ?? null,
    options.to ?? null,
    options.sort ?? 'newest',
    options.page ?? 1,
  ])
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
    '20261105000300_letters_without_house_block.sql',
    '20261105000400_dues_without_house_block.sql',
    '20261105000500_complaints_without_house_block.sql',
    '20261105000600_remove_resident_house_block.sql',
    '20261105000700_letters_without_house_number.sql',
    '20261105000800_dues_without_house_number.sql',
    '20261105000900_complaints_without_house_number.sql',
    '20261105001000_remove_resident_house_number.sql',
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

test('active unverified and incomplete profiles submit; retries preserve one complaint/event and the identity snapshot', async () => {
  const c = await submit(pending, 100)
  assert.equal(c.applicant_id, pending)
  assert.equal(c.status, 'diajukan')
  assert.match(c.reference, /^ADU-\d+$/)
  assert.deepEqual(c.identity_snapshot, {
    full_name: 'Warga Dummy 5',
  })
  assert.equal(c.submitted_payload, undefined)
  assert.deepEqual(await submit(pending, 100), c)
  assert.equal((await detail(pending, c.id)).events.length, 1)
  await assert.rejects(
    submit(pending, 100, 'Berbeda'),
    /COMPLAINT_REQUEST_CONFLICT/,
  )
  await assert.rejects(submit(bob, 100), /COMPLAINT_REQUEST_CONFLICT/)
  await db.query(
    "update public.profiles set full_name='Nama Dummy Baru' where id=$1",
    [pending],
  )
  assert.equal(
    (await detail(pending, c.id)).complaint.identity_snapshot.full_name,
    'Warga Dummy 5',
  )
  assert.deepEqual(await submit(pending, 100), c)
})

test('required input, lengths and all three categories are enforced on the server', async () => {
  for (const category of ['fasilitas_umum', 'keamanan', 'kebersihan_sampah'])
    assert.equal(
      (
        await submit(
          alice,
          110 +
            ['fasilitas_umum', 'keamanan', 'kebersihan_sampah'].indexOf(
              category,
            ),
          'Valid',
          category,
        )
      ).category,
      category,
    )
  for (const [title, category, description] of [
    [' ', 'keamanan', 'Valid'],
    ['\t\n', 'keamanan', 'Valid'],
    ['a'.repeat(201), 'keamanan', 'Valid'],
    ['Valid', 'lainnya', 'Valid'],
    ['Valid', 'keamanan', ' '],
    ['Valid', 'keamanan', '\n\t'],
    ['Valid', 'keamanan', 'a'.repeat(2001)],
    [null, 'keamanan', 'Valid'],
  ])
    await assert.rejects(
      submit(alice, 119, title, category, description),
      /INVALID_COMPLAINT_INPUT/,
    )
  await assert.rejects(
    rpc(alice, 'submit_complaint', [null, 'Valid', 'Valid', 'keamanan']),
    /INVALID_COMPLAINT_INPUT/,
  )
})

test('same-KK residents cannot read other complaints/history or use manager scope; personal manager scope stays personal', async () => {
  const c = await submit(alice, 120)
  await assert.rejects(detail(bob, c.id), /COMPLAINT_NOT_FOUND/)
  await assert.rejects(detail(bob, c.id, 'all'), /ACCESS_DENIED/)
  await assert.rejects(overview(bob, { scope: 'all' }), /ACCESS_DENIED/)
  for (const table of ['complaints', 'complaint_events']) {
    const rows = await asUser(bob, (tx) =>
      tx.query(
        `select * from public.${table} where ${table === 'complaints' ? 'id' : 'complaint_id'}=$1`,
        [c.id],
      ),
    )
    assert.equal(rows.rows.length, 0)
    await assert.rejects(
      asUser(alice, (tx) => tx.exec(`delete from public.${table}`)),
      /permission denied/,
    )
    await assert.rejects(
      asUser(chair, (tx) =>
        tx.exec(
          `update public.${table} set ${table === 'complaints' ? "title='Tampered'" : "note='Tampered'"}`,
        ),
      ),
      /permission denied/,
    )
    await assert.rejects(
      asUser(alice, (tx) =>
        tx.exec(`insert into public.${table} default values`),
      ),
      /permission denied/,
    )
  }
  await assert.rejects(review(bob, c, 'start'), /ACCESS_DENIED/)
  for (const manager of [chair, staff]) {
    assert.equal((await detail(manager, c.id, 'all')).complaint.id, c.id)
    await assert.rejects(detail(manager, c.id), /COMPLAINT_NOT_FOUND/)
    const own = await submit(manager, manager === chair ? 121 : 122)
    assert.equal((await detail(manager, own.id)).complaint.id, own.id)
    assert.equal((await overview(manager)).total, 1)
  }
})

for (const [i, manager] of [chair, staff].entries()) {
  test(`manager ${i + 1} recategorizes, starts, and completes atomically with visible history and version checks`, async () => {
    const c = await submit(alice, 130 + i)
    const recat = await review(manager, c, 'recategorize', '', 'keamanan')
    assert.equal(recat.complaint.status, 'diajukan')
    assert.equal(recat.events.at(-1).previous_category, 'fasilitas_umum')
    assert.equal(recat.events.at(-1).category, 'keamanan')
    await assert.rejects(review(manager, c, 'start'), /STALE_COMPLAINT/)
    await assert.rejects(
      review(manager, recat.complaint, 'complete', 'Hasil'),
      /INVALID_COMPLAINT_TRANSITION/,
    )
    await assert.rejects(
      review(
        manager,
        recat.complaint,
        'recategorize',
        'Catatan terpisah',
        'kebersihan_sampah',
      ),
      /INVALID_COMPLAINT_TRANSITION/,
    )
    const started = await review(
      manager,
      recat.complaint,
      'start',
      'Sudah diperiksa',
    )
    assert.equal(started.complaint.status, 'diproses')
    await assert.rejects(
      review(manager, started.complaint, 'start'),
      /INVALID_COMPLAINT_TRANSITION/,
    )
    await assert.rejects(
      review(manager, started.complaint, 'complete', ' '),
      /COMPLAINT_NOTE_REQUIRED/,
    )
    await assert.rejects(
      review(manager, started.complaint, 'complete', 'a'.repeat(2001)),
      /INVALID_COMPLAINT_INPUT/,
    )
    const done = await review(
      manager,
      started.complaint,
      'complete',
      'Lampu dummy sudah diperbaiki',
    )
    assert.equal(done.complaint.resolution_note, 'Lampu dummy sudah diperbaiki')
    assert.equal(done.events.length, 4)
    assert.equal(
      done.events.at(-1).actor_role,
      i === 0 ? 'ketua_rt' : 'pengurus_rt',
    )
    assert.equal(
      (await detail(alice, c.id)).events.at(-1).note,
      'Lampu dummy sudah diperbaiki',
    )
    await assert.rejects(
      review(manager, started.complaint, 'complete', 'Ulang'),
      /STALE_COMPLAINT/,
    )
    for (const action of ['start', 'complete', 'reject', 'recategorize'])
      await assert.rejects(
        review(
          manager,
          done.complaint,
          action,
          action === 'recategorize' ? '' : 'Catatan',
          'kebersihan_sampah',
        ),
        /INVALID_COMPLAINT_TRANSITION/,
      )
    assert.equal((await detail(alice, c.id)).events.length, 4)
    // An idempotent initial retry still works after category/status changes.
    assert.equal((await submit(alice, 130 + i)).status, 'selesai')
  })
}

test('reject works from both nonterminal states, requires reason and never reopens', async () => {
  for (const [i, status] of ['diajukan', 'diproses'].entries()) {
    let c = await submit(bob, 140 + i)
    if (status === 'diproses') c = (await review(staff, c, 'start')).complaint
    await assert.rejects(
      review(chair, c, 'reject', ''),
      /COMPLAINT_NOTE_REQUIRED/,
    )
    const rejected = await review(
      chair,
      c,
      'reject',
      'Lokasi dummy berada di luar RT',
    )
    assert.equal(rejected.complaint.status, 'ditolak')
    assert.equal(
      (await detail(bob, c.id)).events.at(-1).note,
      'Lokasi dummy berada di luar RT',
    )
    await assert.rejects(
      review(staff, rejected.complaint, 'start'),
      /INVALID_COMPLAINT_TRANSITION/,
    )
  }
})

test('filters, stable pagination and summary count all matches with Jakarta date boundaries', async () => {
  for (let n = 150; n < 156; n++) {
    const c = await submit(alice, n, `Uji rentang ${n}`, 'kebersihan_sampah')
    await db.query(
      'alter table public.complaints disable trigger complaint_update_guard',
    )
    await db.query('update public.complaints set created_at=$1 where id=$2', [
      n === 155
        ? '2026-11-04T17:00:00Z'
        : n === 150
          ? '2026-11-03T16:59:59Z'
          : '2026-11-03T17:00:00Z',
      c.id,
    ])
    await db.query(
      'alter table public.complaints enable trigger complaint_update_guard',
    )
  }
  const filters = {
    scope: 'all',
    search: 'Uji rentang',
    category: 'kebersihan_sampah',
    from: '2026-11-04',
    to: '2026-11-04',
  }
  const range = await overview(chair, filters)
  assert.equal(range.total, 4)
  assert.equal(range.items.length, 4)
  assert.deepEqual(range.summary, {
    diajukan: 4,
    diproses: 0,
    selesai: 0,
    ditolak: 0,
  })
  const all = await overview(staff, { scope: 'all', search: 'Uji rentang' })
  const second = await overview(staff, {
    scope: 'all',
    search: 'Uji rentang',
    page: 2,
  })
  assert.equal(all.total, 6)
  assert.equal(second.items.length, 2)
  assert.equal(second.summary.diajukan, 6)
  assert.equal(
    new Set([...all.items, ...second.items].map((c) => c.id)).size,
    6,
  )
  assert.equal((await overview(alice, { search: 'Uji rentang' })).summary, null)
  assert.equal((await overview(alice, { search: 'Warga Dummy 3' })).total, 0)
  assert.ok(
    (await overview(chair, { scope: 'all', search: 'Warga Dummy 3' })).total >
      0,
  )
  const exact = await overview(chair, {
    scope: 'all',
    search: range.items[0].reference,
  })
  assert.equal(exact.total, 1)
  const zero = await overview(chair, { ...filters, status: 'selesai' })
  assert.equal(zero.total, 0)
  assert.deepEqual(zero.summary, {
    diajukan: 0,
    diproses: 0,
    selesai: 0,
    ditolak: 0,
  })
  await assert.rejects(
    overview(alice, { from: '2026-11-05', to: '2026-11-04' }),
    /INVALID_COMPLAINT_INPUT/,
  )
  for (const options of [
    { scope: 'other' },
    { category: 'other' },
    { status: 'other' },
    { page: 0 },
    { sort: 'other' },
    { search: 'x'.repeat(201) },
  ])
    await assert.rejects(overview(chair, options), /INVALID_COMPLAINT_INPUT/)
})

test('data and history roll back together when audit insertion fails', async () => {
  await db.exec(`create function app_private.fail_complaint_audit() returns trigger language plpgsql as $$
    begin raise exception 'DUMMY_AUDIT_FAILURE'; end; $$;
    create trigger dummy_audit_failure before insert on public.complaint_events
      for each row execute function app_private.fail_complaint_audit();`)
  await assert.rejects(submit(alice, 180), /DUMMY_AUDIT_FAILURE/)
  assert.equal(
    (await db.query('select * from public.complaints where id=$1', [uid(180)]))
      .rows.length,
    0,
  )
  await db.exec('drop trigger dummy_audit_failure on public.complaint_events')
  const c = await submit(alice, 180)
  await db.exec(`create trigger dummy_audit_failure before insert on public.complaint_events
    for each row execute function app_private.fail_complaint_audit()`)
  await assert.rejects(
    review(staff, c, 'start', 'Catatan dummy'),
    /DUMMY_AUDIT_FAILURE/,
  )
  const unchanged = await detail(alice, c.id)
  assert.equal(unchanged.complaint.updated_at, c.updated_at)
  assert.equal(unchanged.complaint.status, 'diajukan')
  assert.equal(unchanged.events.length, 1)
  await db.exec(
    'drop trigger dummy_audit_failure on public.complaint_events; drop function app_private.fail_complaint_audit()',
  )
})

test('inactive, archived, revoked and anonymous access cannot read or write complaints/history', async () => {
  const c = await submit(pending, 160)
  for (const change of [
    'is_active=false',
    'is_active=false,archived_at=now()',
  ]) {
    await db.query(`update public.profiles set ${change} where id=$1`, [
      pending,
    ])
    await assert.rejects(submit(pending, 161), /ACCESS_DENIED/)
    await assert.rejects(detail(pending, c.id), /ACCESS_DENIED/)
    assert.equal(
      (
        await asUser(pending, (tx) =>
          tx.exec('select * from public.complaints'),
        )
      )[0].rows.length,
      0,
    )
    assert.equal(
      (
        await asUser(pending, (tx) =>
          tx.exec('select * from public.complaint_events'),
        )
      )[0].rows.length,
      0,
    )
  }
  await db.query(
    'update public.profiles set is_active=true,archived_at=null where id=$1',
    [pending],
  )
  await db.query('delete from auth.sessions where user_id=$1', [pending])
  await assert.rejects(submit(pending, 161), /ACCESS_DENIED/)
  await assert.rejects(detail(pending, c.id), /ACCESS_DENIED/)
  await db.query('update public.profiles set is_active=false where id=$1', [
    staff,
  ])
  await assert.rejects(review(staff, c, 'start'), /ACCESS_DENIED/)
  await assert.rejects(overview(staff, { scope: 'all' }), /ACCESS_DENIED/)
  await db.query(
    "update public.profiles set is_active=true,role='warga' where id=$1",
    [staff],
  )
  await assert.rejects(review(staff, c, 'start'), /ACCESS_DENIED/)
  await db.query("update public.profiles set role='pengurus_rt' where id=$1", [
    staff,
  ])
  await db.query('delete from auth.sessions where user_id=$1', [staff])
  await assert.rejects(review(staff, c, 'start'), /ACCESS_DENIED/)
  await assert.rejects(overview(staff, { scope: 'all' }), /ACCESS_DENIED/)
  await assert.rejects(
    asUser('', (tx) => tx.exec('select * from public.complaints'), 'anon'),
    /permission denied/,
  )
  await assert.rejects(
    asUser(
      '',
      (tx) => tx.query('select public.complaint_detail($1)', [c.id]),
      'anon',
    ),
    /permission denied/,
  )
})
