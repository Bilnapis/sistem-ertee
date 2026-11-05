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
  pending = uid(5),
  incomplete = uid(6)
const fields = (n) => ({
  full_name: `Warga Dummy ${n}`,
  nik: String(n).padStart(16, '0'),
  family_card_number: '0000000000000099',
  gender: 'laki_laki',
  marital_status: 'menikah',
  house_number: String(n),
  phone: '081234567890',
  address: 'Jalan Dummy Nomor 1',
})
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
async function submit(actor, n, options = {}) {
  return asUser(
    actor,
    async (tx) =>
      (
        await tx.query(
          'select * from public.submit_letter_request($1,$2,$3,$4,$5,$6)',
          [
            uid(n),
            options.type ?? 'domisili',
            options.purpose ?? 'Administrasi dummy',
            options.phone ?? '081234567890',
            options.notes ?? '',
            options.attachment ? JSON.stringify(options.attachment) : null,
          ],
        )
      ).rows[0],
  )
}
const get = async (id) =>
  (await db.query('select * from public.letter_requests where id=$1', [id]))
    .rows[0]
const advance = async (actor, request, status) =>
  asUser(
    actor,
    async (tx) =>
      (
        await tx.query(
          'select * from public.advance_letter_request($1,$2,$3)',
          [request.id, status, request.updated_at],
        )
      ).rows[0],
  )
const list = async (
  actor,
  scope = 'mine',
  search = '',
  type = 'all',
  status = 'all',
  sort = 'newest',
  page = 1,
) =>
  asUser(
    actor,
    async (tx) =>
      (
        await tx.query(
          'select public.list_letter_requests($1,$2,$3,$4,$5,$6) as data',
          [scope, search, type, status, sort, page],
        )
      ).rows[0].data,
  )
const objectPath = (actor, n, ext = 'pdf') =>
  `${actor}/${uid(n)}/${'a'.repeat(64)}.${ext}`
const attachment = (actor, n) => ({
  path: objectPath(actor, n),
  name: 'Lampiran Dummy.pdf',
  size: 100,
  type: 'application/pdf',
})
const upload = async (
  actor,
  path,
  metadata = { size: 100, mimetype: 'application/pdf' },
) =>
  asUser(actor, (tx) =>
    tx.query(
      'insert into storage.objects(bucket_id,name,metadata) values ($1,$2,$3)',
      ['letter-attachments', path, JSON.stringify(metadata)],
    ),
  )

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
    '20261105000300_letters_without_house_block.sql',
    '20261105000600_remove_resident_house_block.sql',
  ])
    await db.exec(
      await readFile(
        new URL(`../supabase/migrations/${migration}`, import.meta.url),
        'utf8',
      ),
    )
  for (let n = 1; n <= 6; n++) {
    const metadata = fields(n)
    if (n === 6) delete metadata.family_card_number
    await db.query(
      'insert into auth.users(id,email,raw_user_meta_data) values ($1,$2,$3)',
      [uid(n), `dummy${n}@example.test`, JSON.stringify(metadata)],
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
  await db.query(
    "update public.profiles set verification_status='terverifikasi' where id<>$1",
    [pending],
  )
})
after(() => db.close())

test('submission uses current owner and a frozen identity snapshot; retries produce one request/event', async () => {
  const request = await submit(alice, 101)
  assert.equal(request.applicant_id, alice)
  assert.equal(request.reference, 'SRT-001')
  assert.equal(request.status, 'pengajuan')
  assert.equal(request.identity_snapshot.full_name, fields(3).full_name)
  assert.equal(Object.hasOwn(request.identity_snapshot, 'house_block'), false)
  assert.equal((await submit(alice, 101)).id, request.id)
  assert.equal(
    (
      await db.query('select * from public.letter_events where request_id=$1', [
        request.id,
      ])
    ).rows.length,
    1,
  )
  await assert.rejects(
    submit(alice, 101, { purpose: 'Changed request' }),
    /LETTER_REQUEST_CONFLICT/,
  )
  await assert.rejects(submit(bob, 101), /LETTER_REQUEST_CONFLICT/)
  await db.query(
    "update public.profiles set address='Alamat Dummy Berubah' where id=$1",
    [alice],
  )
  assert.equal(
    (await get(request.id)).identity_snapshot.address,
    fields(3).address,
  )
  // A lost response can still be recovered after a subsequent profile change.
  assert.equal((await submit(alice, 101)).id, request.id)
  await db.query(
    "update public.profiles set verification_status='terverifikasi' where id=$1",
    [alice],
  )
})

test('complete verified profiles are required; callers cannot forge status or identity through direct writes', async () => {
  await assert.rejects(submit(pending, 102), /PROFILE_NOT_VERIFIED/)
  await assert.rejects(submit(incomplete, 102), /INCOMPLETE_PROFILE/)
  for (const options of [
    { type: 'invalid' },
    { purpose: ' ' },
    { phone: 'abc' },
    { notes: 'x'.repeat(2001) },
  ])
    await assert.rejects(submit(alice, 102, options), /INVALID_LETTER_INPUT/)
  await assert.rejects(
    asUser(alice, (tx) =>
      tx.exec(
        'insert into public.letter_requests(id,applicant_id) values (null,null)',
      ),
    ),
    /permission denied/,
  )
  await assert.rejects(
    asUser(alice, (tx) =>
      tx.exec("update public.letter_requests set status='selesai'"),
    ),
    /permission denied/,
  )
  await assert.rejects(
    asUser(alice, (tx) => tx.exec('delete from public.letter_events')),
    /permission denied/,
  )
})

test('RLS hides another resident, including same-KK requests, history, and management RPCs', async () => {
  const other = await submit(bob, 103)
  const own = await list(alice)
  assert.ok(own.items.every((request) => request.applicant_id === alice))
  assert.equal(
    (
      await asUser(alice, (tx) =>
        tx.query('select * from public.letter_requests where id=$1', [
          other.id,
        ]),
      )
    ).rows.length,
    0,
  )
  assert.equal(
    (
      await asUser(alice, (tx) =>
        tx.query('select * from public.letter_events where request_id=$1', [
          other.id,
        ]),
      )
    ).rows.length,
    0,
  )
  await assert.rejects(list(alice, 'all'), /ACCESS_DENIED/)
  await assert.rejects(
    asUser(alice, (tx) => tx.exec('select public.letter_summary()')),
    /ACCESS_DENIED/,
  )
  await assert.rejects(advance(alice, other, 'diproses'), /ACCESS_DENIED/)
  await assert.rejects(
    asUser('', (tx) => tx.exec('select public.list_letter_requests()'), 'anon'),
    /permission denied/,
  )
})

test('both manager roles advance the same three statuses and preserve actor history', async () => {
  for (const actor of [chair, staff]) {
    let request = await submit(alice, actor === chair ? 104 : 105)
    const first = request
    await assert.rejects(
      advance(actor, request, 'selesai'),
      /INVALID_LETTER_TRANSITION/,
    )
    request = await advance(actor, request, 'diproses')
    await assert.rejects(
      advance(actor === chair ? staff : chair, first, 'diproses'),
      /STALE_LETTER/,
    )
    request = await advance(actor, request, 'selesai')
    await assert.rejects(
      advance(actor, request, 'pengajuan'),
      /INVALID_LETTER_TRANSITION/,
    )
    assert.equal(request.status, 'selesai')
    const history = (
      await asUser(alice, (tx) =>
        tx.query(
          'select * from public.letter_events where request_id=$1 order by id',
          [request.id],
        ),
      )
    ).rows
    assert.deepEqual(
      history.map((event) => event.status),
      ['pengajuan', 'diproses', 'selesai'],
    )
    assert.equal(history[1].actor_id, actor)
    assert.equal(
      history[2].actor_name,
      actor === chair ? fields(1).full_name : fields(2).full_name,
    )
    assert.deepEqual(
      history.map((event) => event.previous_status),
      [null, 'pengajuan', 'diproses'],
    )
  }
})

test('list filters, literal search, pagination, personal manager scope, and totals are consistent', async () => {
  for (let n = 110; n <= 115; n++) await submit(bob, n, { type: 'usaha' })
  await submit(chair, 116, { type: 'skck' })
  const all = await list(chair, 'all'),
    second = await list(chair, 'all', '', 'all', 'all', 'newest', 2)
  assert.equal(all.items.length, 4)
  assert.equal(
    new Set([...all.items, ...second.items].map((row) => row.id)).size,
    8,
  )
  assert.equal((await list(chair, 'all', 'Usaha')).total, 6)
  assert.equal((await list(chair, 'all', '%')).total, 0)
  assert.equal((await list(chair, 'all', '', 'all', 'selesai')).total, 2)
  assert.equal((await list(chair, 'mine')).total, 1)
  const summary = (
    await asUser(staff, (tx) =>
      tx.exec('select public.letter_summary() as data'),
    )
  )[0].rows[0].data
  assert.equal(summary.total, all.total)
  assert.equal(
    summary.pengajuan + summary.diproses + summary.selesai,
    summary.total,
  )
})

test('attachment paths, metadata, size and content types are checked; linked files are immutable', async () => {
  const file = attachment(alice, 120)
  await upload(alice, file.path)
  assert.equal(
    (
      await asUser(bob, (tx) =>
        tx.query('select * from storage.objects where name=$1', [file.path]),
      )
    ).rows.length,
    0,
  )
  assert.equal(
    (
      await asUser(chair, (tx) =>
        tx.query('select * from storage.objects where name=$1', [file.path]),
      )
    ).rows.length,
    0,
  )
  await assert.rejects(
    submit(bob, 120, { attachment: file }),
    /INVALID_ATTACHMENT/,
  )
  await assert.rejects(
    upload(bob, objectPath(alice, 121)),
    /row-level security/,
  )
  await assert.rejects(
    upload(pending, objectPath(pending, 121)),
    /row-level security/,
  )
  await assert.rejects(
    upload(alice, `${alice}/${uid(121)}/script.html`),
    /row-level security/,
  )
  await assert.rejects(
    submit(alice, 120, { attachment: { ...file, size: 99 } }),
    /INVALID_ATTACHMENT/,
  )
  for (const invalid of [
    { name: { unexpected: 'object' } },
    { path: null },
    { size: '100' },
    { type: null },
  ]) {
    await assert.rejects(
      submit(alice, 120, { attachment: { ...file, ...invalid } }),
      /INVALID_ATTACHMENT/,
    )
  }
  const request = await submit(alice, 120, { attachment: file })
  assert.equal(request.attachment.path, file.path)
  for (const actor of [alice, chair, staff])
    assert.equal(
      (
        await asUser(actor, (tx) =>
          tx.query('select * from storage.objects where name=$1', [file.path]),
        )
      ).rows.length,
      1,
    )
  assert.equal(
    (
      await asUser(alice, (tx) =>
        tx.query('delete from storage.objects where name=$1 returning name', [
          file.path,
        ]),
      )
    ).rows.length,
    0,
  )
  assert.equal(
    (
      await asUser(alice, (tx) =>
        tx.query(
          "update storage.objects set metadata='{}' where name=$1 returning name",
          [file.path],
        ),
      )
    ).rows.length,
    0,
  )
  await assert.rejects(
    upload(alice, objectPath(alice, 120, 'png')),
    /row-level security/,
  )
  for (const [n, metadata] of [
    [121, { size: 5242881, mimetype: 'application/pdf' }],
    [122, { size: 100, mimetype: 'text/html' }],
    [123, { size: 0, mimetype: 'application/pdf' }],
  ]) {
    const badFile = {
      ...attachment(alice, n),
      size: metadata.size,
      type: metadata.mimetype,
    }
    await upload(alice, badFile.path, metadata)
    await assert.rejects(
      submit(alice, n, { attachment: badFile }),
      /INVALID_ATTACHMENT/,
    )
  }
  const bucket = (await db.query('select * from storage.buckets')).rows[0]
  assert.equal(bucket.public, false)
  assert.equal(Number(bucket.file_size_limit), 5242880)
  assert.deepEqual(bucket.allowed_mime_types, [
    'image/jpeg',
    'image/png',
    'application/pdf',
  ])
})

test('all eight letter types and both image formats can be submitted', async () => {
  const types = [
    'domisili',
    'usaha',
    'skck',
    'tidak_mampu',
    'pindah',
    'administrasi_kependudukan',
    'keterangan_warga',
    'lainnya',
  ]
  for (const [index, type] of types.entries()) {
    const request = await submit(alice, 140 + index, {
      type,
      phone: '+6281234567890',
    })
    assert.equal(request.letter_type, type)
    assert.ok(request.letter_type_label)
  }
  for (const [n, mime, extension] of [
    [160, 'image/jpeg', 'jpg'],
    [161, 'image/png', 'png'],
  ]) {
    const file = {
      path: objectPath(alice, n, extension),
      name: `Dummy.${extension}`,
      size: 100,
      type: mime,
    }
    await upload(alice, file.path, { size: file.size, mimetype: mime })
    assert.equal(
      (await submit(alice, n, { attachment: file })).attachment.type,
      mime,
    )
  }
})

test('inactive, archived, demoted and revoked users lose letter and attachment access', async () => {
  const request = await get(uid(120))
  await db.query("update public.profiles set role='warga' where id=$1", [staff])
  await assert.rejects(advance(staff, request, 'diproses'), /ACCESS_DENIED/)
  assert.equal(
    (await asUser(staff, (tx) => tx.query('select * from storage.objects')))
      .rows.length,
    0,
  )
  await db.query("update public.profiles set role='pengurus_rt' where id=$1", [
    staff,
  ])
  await db.query('delete from auth.sessions where user_id=$1', [staff])
  await assert.rejects(list(staff, 'all'), /ACCESS_DENIED/)
  assert.equal(
    (
      await asUser(staff, (tx) =>
        tx.query('select * from public.letter_requests'),
      )
    ).rows.length,
    0,
  )
  assert.equal(
    (await asUser(staff, (tx) => tx.query('select * from storage.objects')))
      .rows.length,
    0,
  )
  await db.query(
    'update public.profiles set is_active=false, archived_at=now() where id=$1',
    [alice],
  )
  await assert.rejects(submit(alice, 130), /ACCESS_DENIED/)
  assert.equal(
    (
      await asUser(alice, (tx) =>
        tx.query('select * from public.letter_requests'),
      )
    ).rows.length,
    0,
  )
  assert.equal(
    (await asUser(alice, (tx) => tx.query('select * from storage.objects')))
      .rows.length,
    0,
  )
  assert.ok((await list(chair, 'all')).total > 0)
})
