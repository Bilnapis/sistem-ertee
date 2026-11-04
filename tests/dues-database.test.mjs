import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'

const db = new PGlite()
const uid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const session = (id) => id.replace('8000', '9000')
const isoDate = (value) =>
  value instanceof Date ? value.toISOString().slice(0, 10) : value
const chair = uid(1),
  staff = uid(2),
  alice = uid(3),
  bob = uid(4)
let today, month
const query = async (sql, args = []) => (await db.query(sql, args)).rows
const asUser = (actor, work, role = 'authenticated') =>
  db.transaction(async (tx) => {
    await tx.exec(`set local role ${role}`)
    await tx.query("select set_config('request.jwt.claim.sub',$1,true)", [
      actor ?? '',
    ])
    await tx.query("select set_config('request.jwt.claims',$1,true)", [
      JSON.stringify({ session_id: actor ? session(actor) : '' }),
    ])
    return work(tx)
  })
const rpc = (actor, sql, args = []) =>
  asUser(actor, async (tx) => (await tx.query(sql, args)).rows[0]?.data)
const invoiceFor = async (actor) =>
  (
    await query(
      'select * from public.dues_invoices where resident_id=$1 and period=$2',
      [actor, month],
    )
  )[0]
const overview = (
  actor,
  scope = 'mine',
  period = null,
  status = 'all',
  method = 'all',
  search = '',
  page = 1,
) =>
  rpc(actor, 'select public.dues_overview($1,$2,$3,$4,$5,$6) data', [
    scope,
    period,
    status,
    method,
    search,
    page,
  ])
const detail = (actor, id) =>
  rpc(actor, 'select public.dues_detail($1) data', [id])
const submit = async (actor, n, options = {}) =>
  rpc(actor, 'select public.submit_dues_payment($1,$2,$3,$4,$5,$6) data', [
    uid(n),
    options.invoice ?? (await invoiceFor(actor)).id,
    options.method ?? 'tunai',
    options.date ?? today,
    options.notes ?? '',
    options.proof ? JSON.stringify(options.proof) : null,
  ])
const review = (actor, payment, action, note = '') =>
  rpc(actor, 'select public.review_dues_payment($1,$2,$3,$4) data', [
    payment.id,
    action,
    note,
    payment.updated_at,
  ])
const configure = async (amount = 50000, day = 10, bank = 'Bank Dummy') => {
  const config = await rpc(chair, 'select public.dues_configuration() data')
  return rpc(
    chair,
    'select public.update_dues_configuration($1,$2,$3,$4,$5,$6) data',
    [
      amount,
      day,
      bank,
      bank ? '1234567890' : '',
      bank ? 'Pengurus Dummy' : '',
      config.updated_at,
    ],
  )
}
const proof = (actor, n) => ({
  path: `${actor}/${uid(n)}/${'a'.repeat(64)}.pdf`,
  name: 'Bukti Dummy.pdf',
  type: 'application/pdf',
  size: 100,
})
const upload = (actor, p) =>
  asUser(actor, (tx) =>
    tx.query(
      'insert into storage.objects(bucket_id,name,metadata) values($1,$2,$3)',
      [
        'dues-proofs',
        p.path,
        JSON.stringify({ size: p.size, mimetype: p.type }),
      ],
    ),
  )
const totalIncome = async () =>
  Number(
    (
      await query(
        "select coalesce(sum(amount),0) amount from public.dues_cash_entries where status='tercatat'",
      )
    )[0].amount,
  )

before(async () => {
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create schema storage;
    create table auth.users(id uuid primary key,email text unique,raw_user_meta_data jsonb default '{}',raw_app_meta_data jsonb default '{}');
    create table auth.sessions(id uuid primary key,user_id uuid references auth.users(id) on delete cascade);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create function auth.jwt() returns jsonb language sql stable as $$ select nullif(current_setting('request.jwt.claims',true),'')::jsonb $$;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id bigint generated always as identity,bucket_id text references storage.buckets(id),name text unique,metadata jsonb);
    alter table storage.objects enable row level security;
    grant usage on schema auth,public,storage to anon,authenticated,service_role;
    grant execute on function auth.uid() to authenticated;
    grant select,insert,update,delete on storage.objects to authenticated;
    grant usage on all sequences in schema storage to authenticated;`)
  for (const file of [
    '20261102000100_resident_auth.sql',
    '20261103000100_resident_management.sql',
    '20261104000100_letter_requests.sql',
    '20261104000200_monthly_dues.sql',
  ])
    await db.exec(
      await readFile(
        new URL(`../supabase/migrations/${file}`, import.meta.url),
        'utf8',
      ),
    )
  ;({ today, month } = (
    await query(
      "select (now() at time zone 'Asia/Jakarta')::date::text today,date_trunc('month',now() at time zone 'Asia/Jakarta')::date::text as \"month\"",
    )
  )[0])
  for (let n = 1; n <= 8; n++) {
    await db.query(
      'insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)',
      [
        uid(n),
        `dummy${n}@example.test`,
        JSON.stringify({
          full_name: `Warga Dummy ${n}`,
          nik: String(n).padStart(16, '0'),
          phone: '081234567890',
          address: 'Jalan Dummy Nomor 1',
          house_block: 'DUMMY-A',
        }),
      ],
    )
    await db.query('insert into auth.sessions values($1,$2)', [
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

test('activation creates one invoice per active profile, including managers and unverified residents', async () => {
  const rows = await query(
    'select * from public.dues_invoices where period=$1',
    [month],
  )
  assert.equal(rows.length, 8)
  assert.ok(
    rows.every(
      (row) =>
        Number(row.amount) === 50000 &&
        isoDate(row.due_date) === `${month.slice(0, 7)}-10`,
    ),
  )
  await overview(alice)
  await overview(chair, 'all')
  await db.exec('select app_private.generate_monthly_dues()')
  assert.equal(
    (await query('select * from public.dues_invoices where period=$1', [month]))
      .length,
    8,
  )
  assert.equal((await overview(alice)).items.length, 1)
  assert.equal((await overview(chair, 'all')).summary.total, 8)
})
test('cash confirmation is idempotent and creates no cash until a manager approves', async () => {
  const first = await submit(alice, 101)
  assert.equal(first.invoice.status, 'menunggu_verifikasi')
  assert.equal(first.payments[0].attachment, null)
  assert.equal(await totalIncome(), 0)
  const retried = await submit(alice, 101)
  assert.equal(retried.payments.length, 1)
  assert.equal(retried.events.length, 1)
  await assert.rejects(
    submit(alice, 101, { notes: 'Changed payload' }),
    /DUES_REQUEST_CONFLICT/,
  )
  await assert.rejects(submit(bob, 101), /DUES_REQUEST_CONFLICT/)
  await assert.rejects(submit(alice, 102), /DUES_PAYMENT_EXISTS/)
  await assert.rejects(
    review(alice, first.payments[0], 'disetujui'),
    /ACCESS_DENIED/,
  )
  const approved = await review(chair, first.payments[0], 'disetujui')
  assert.equal(approved.invoice.status, 'lunas')
  await review(staff, first.payments[0], 'disetujui')
  assert.equal(await totalIncome(), 50000)
  assert.equal(
    (await query('select * from public.dues_cash_entries')).length,
    1,
  )
  assert.equal((await detail(alice, first.invoice.id)).events.length, 2)
})
test('transfer needs configured bank and a valid immutable private upload', async () => {
  await assert.rejects(
    submit(bob, 201, { method: 'transfer' }),
    /BANK_NOT_CONFIGURED/,
  )
  await configure()
  await assert.rejects(
    submit(bob, 201, { method: 'transfer' }),
    /INVALID_DUES_PROOF/,
  )
  const attachment = proof(bob, 201)
  await assert.rejects(
    submit(bob, 201, { method: 'transfer', proof: attachment }),
    /INVALID_DUES_PROOF/,
  )
  await upload(bob, attachment)
  await assert.rejects(
    submit(bob, 201, {
      method: 'transfer',
      proof: { ...attachment, size: 200 },
    }),
    /INVALID_DUES_PROOF/,
  )
  const submitted = await submit(bob, 201, {
    method: 'transfer',
    proof: attachment,
  })
  assert.equal(submitted.payments[0].bank_snapshot.bank_name, 'Bank Dummy')
  await assert.rejects(
    asUser(bob, (tx) =>
      tx.query(
        'insert into storage.objects(bucket_id,name,metadata) values($1,$2,$3)',
        [
          'dues-proofs',
          attachment.path.replace('a'.repeat(64), 'b'.repeat(64)),
          JSON.stringify({ size: 100, mimetype: 'application/pdf' }),
        ],
      ),
    ),
    /row-level security/,
  )
  assert.equal(
    (
      await asUser(alice, (tx) =>
        tx.query("select * from storage.objects where bucket_id='dues-proofs'"),
      )
    ).rows.length,
    0,
  )
  assert.equal(
    (
      await asUser(bob, (tx) =>
        tx.query("select * from storage.objects where bucket_id='dues-proofs'"),
      )
    ).rows.length,
    1,
  )
  assert.equal(
    (
      await asUser(staff, (tx) =>
        tx.query("select * from storage.objects where bucket_id='dues-proofs'"),
      )
    ).rows.length,
    1,
  )
  await asUser(bob, (tx) =>
    tx.exec(
      "update storage.objects set metadata='{}' where bucket_id='dues-proofs'; delete from storage.objects where bucket_id='dues-proofs'",
    ),
  )
  assert.equal(
    (
      await query("select * from storage.objects where bucket_id='dues-proofs'")
    )[0].metadata.size,
    100,
  )
})
test('stale review, rejection, replacement and cancellation keep cash and audit consistent', async () => {
  const pending = (await detail(staff, (await invoiceFor(bob)).id)).payments[0]
  await assert.rejects(
    review(
      staff,
      { ...pending, updated_at: '2000-01-01T00:00:00Z' },
      'disetujui',
    ),
    /STALE_DUES/,
  )
  await assert.rejects(review(staff, pending, 'ditolak'), /DUES_NOTE_REQUIRED/)
  const rejected = await review(staff, pending, 'ditolak', 'Bukti belum sesuai')
  assert.equal(rejected.invoice.status, 'belum_bayar')
  const replacement = await submit(bob, 202)
  const approved = await review(chair, replacement.payments[0], 'disetujui')
  assert.equal(await totalIncome(), 100000)
  const current = approved.payments.find((p) => p.status === 'disetujui')
  await assert.rejects(
    review(chair, current, 'dibatalkan'),
    /DUES_NOTE_REQUIRED/,
  )
  const cancelled = await review(
    chair,
    current,
    'dibatalkan',
    'Pencatatan keliru',
  )
  await review(staff, current, 'dibatalkan', 'Pencatatan keliru')
  assert.equal(cancelled.invoice.status, 'belum_bayar')
  assert.equal(await totalIncome(), 50000)
  assert.equal(cancelled.payments.length, 2)
  assert.equal(
    cancelled.events.filter((e) => e.action === 'dibatalkan').length,
    1,
  )
  const again = await submit(bob, 203)
  await review(staff, again.payments[0], 'disetujui')
  assert.equal(await totalIncome(), 100000)
  assert.equal(
    (
      await query(
        "select * from public.dues_cash_entries where status='dibatalkan'",
      )
    ).length,
    1,
  )
})
test('direct table writes, cross-owner APIs, anonymous/private RPC and revoked sessions are denied', async () => {
  const aliceInvoice = await invoiceFor(alice)
  await assert.rejects(detail(bob, aliceInvoice.id), /DUES_NOT_FOUND/)
  await assert.rejects(
    submit(bob, 301, { invoice: aliceInvoice.id }),
    /DUES_NOT_FOUND/,
  )
  await assert.rejects(overview(alice, 'all'), /ACCESS_DENIED/)
  await assert.rejects(
    rpc(alice, 'select public.dues_configuration() data', []).then(() =>
      asUser(alice, (tx) =>
        tx.exec('select app_private.generate_monthly_dues()'),
      ),
    ),
    /permission denied/,
  )
  for (const table of [
    'dues_invoices',
    'dues_payments',
    'dues_cash_entries',
    'dues_events',
    'dues_settings',
    'dues_rates',
  ]) {
    await assert.rejects(
      asUser(chair, (tx) => tx.exec(`delete from public.${table}`)),
      /permission denied/,
    )
    await assert.rejects(
      asUser(alice, (tx) =>
        tx.exec(`insert into public.${table} default values`),
      ),
      /permission denied/,
    )
  }
  await assert.rejects(
    asUser(null, (tx) => tx.exec('select public.dues_configuration()'), 'anon'),
    /permission denied/,
  )
  assert.equal(
    (
      await asUser(alice, (tx) =>
        tx.query('select * from public.dues_cash_entries'),
      )
    ).rows.length,
    0,
  )
  assert.equal(
    (
      await asUser(alice, (tx) =>
        tx.query('select * from public.dues_invoices'),
      )
    ).rows.every((row) => row.resident_id === alice),
    true,
  )
  await db.query('delete from auth.sessions where user_id=$1', [uid(6)])
  await assert.rejects(overview(uid(6)), /ACCESS_DENIED/)
  assert.equal(
    (
      await asUser(uid(6), (tx) =>
        tx.query('select * from public.dues_invoices'),
      )
    ).rows.length,
    0,
  )
})
test('numeric/date/proof validation and filtering run in the trusted database', async () => {
  for (const amount of [0, -1, 0.5, 1000000000000])
    await assert.rejects(configure(amount), /INVALID_DUES_SETTINGS/)
  await assert.rejects(configure(50000, 32), /INVALID_DUES_SETTINGS/)
  await assert.rejects(
    submit(uid(5), 401, { date: '2999-01-01' }),
    /INVALID_DUES_PAYMENT/,
  )
  await assert.rejects(
    submit(uid(5), 401, { proof: proof(uid(5), 401) }),
    /CASH_PROOF_NOT_ALLOWED/,
  )
  const config = await rpc(chair, 'select public.dues_configuration() data')
  await assert.rejects(
    rpc(
      alice,
      'select public.update_dues_configuration($1,$2,$3,$4,$5,$6) data',
      [50000, 10, '', '', '', config.updated_at],
    ),
    /ACCESS_DENIED/,
  )
  assert.equal((await overview(chair, 'all', month, 'lunas')).total, 2)
  assert.equal(
    (await overview(staff, 'all', month, 'all', 'all', 'Dummy 3')).total,
    1,
  )
  assert.equal(
    (await overview(chair, 'all', month, 'all', 'all', '%')).total,
    0,
  )
  assert.equal((await overview(chair, 'all', month, 'all', 'tunai')).total, 2)
  assert.equal((await overview(chair, 'all')).summary.income, 100000)
  assert.equal((await overview(alice)).summary.income, 50000)
  await assert.rejects(
    overview(chair, 'all', month, 'all', 'all', '', 0),
    /INVALID_DUES_FILTER/,
  )
})
test('approval rolls back completely when the linked cash entry cannot be saved', async () => {
  const submitted = await submit(uid(5), 450)
  await db.exec(`create function app_private.fail_dues_cash_test() returns trigger language plpgsql as $$ begin raise exception 'TEST_CASH_UNAVAILABLE'; end $$;
    create trigger test_cash_failure before insert on public.dues_cash_entries for each row execute function app_private.fail_dues_cash_test();`)
  try {
    await assert.rejects(
      review(staff, submitted.payments[0], 'disetujui'),
      /TEST_CASH_UNAVAILABLE/,
    )
    const unchanged = await detail(uid(5), submitted.invoice.id)
    assert.equal(unchanged.invoice.status, 'menunggu_verifikasi')
    assert.equal(unchanged.payments[0].status, 'diajukan')
    assert.equal(unchanged.events.length, 1)
    assert.equal(await totalIncome(), 100000)
  } finally {
    await db.exec(
      'drop trigger test_cash_failure on public.dues_cash_entries; drop function app_private.fail_dues_cash_test();',
    )
  }
  await review(staff, submitted.payments[0], 'ditolak', 'Pengujian ulang')
})

test('cash totals use the actual payment date and ignore cancelled entries', async () => {
  const previousMonth = (
    await query(
      "select (date_trunc('month',now() at time zone 'Asia/Jakarta') - interval '1 day')::date::text payment_date",
    )
  )[0].payment_date
  const submitted = await submit(uid(5), 451, { date: previousMonth })
  const approved = await review(staff, submitted.payments[0], 'disetujui')
  assert.equal((await overview(chair, 'all')).summary.income, 100000)
  const period = `${previousMonth.slice(0, 7)}-01`
  assert.equal((await overview(chair, 'all', period)).summary.income, 50000)
  await review(
    chair,
    approved.payments.find((p) => p.status === 'disetujui'),
    'dibatalkan',
    'Pembayaran dummy dibatalkan',
  )
  assert.equal((await overview(chair, 'all', period)).summary.income, 0)
  assert.equal(await totalIncome(), 100000)
})

test('simultaneous duplicate requests produce one pending payment and no duplicate cash', async () => {
  const results = await Promise.all([submit(uid(7), 501), submit(uid(7), 501)])
  assert.equal(results[0].payments[0].id, results[1].payments[0].id)
  const race = await Promise.allSettled([
    submit(uid(8), 502),
    submit(uid(8), 503),
  ])
  assert.equal(race.filter((result) => result.status === 'fulfilled').length, 1)
  assert.equal(
    (await detail(uid(7), (await invoiceFor(uid(7))).id)).events.length,
    1,
  )
})
test('settings take effect next month; short months, WIB year boundary, inactive accounts and snapshots hold', async () => {
  const previous = await invoiceFor(alice),
    config = await configure(75000, 31, 'Bank Baru Dummy')
  assert.equal(config.current_rate.amount, 50000)
  assert.equal(config.next_rate.amount, 75000)
  assert.equal((await invoiceFor(alice)).amount, previous.amount)
  const approved = (
    await detail(bob, (await invoiceFor(bob)).id)
  ).payments.find((p) => p.method === 'transfer')
  assert.equal(approved.bank_snapshot.bank_name, 'Bank Dummy')
  await db.query('update public.profiles set is_active=false where id=$1', [
    uid(5),
  ])
  const next = config.next_month
  await db.query('select app_private.generate_monthly_dues($1)', [
    `${next}T00:00:00+07:00`,
  ])
  assert.equal(
    (
      await query(
        'select * from public.dues_invoices where resident_id=$1 and period=$2',
        [uid(5), next],
      )
    ).length,
    0,
  )
  assert.equal(
    Number(
      (
        await query(
          'select * from public.dues_invoices where resident_id=$1 and period=$2',
          [alice, next],
        )
      )[0].amount,
    ),
    75000,
  )
  const futureYear = Number(month.slice(0, 4)) + 2
  await db.query('select app_private.generate_monthly_dues($1)', [
    `${futureYear - 1}-12-31T16:59:59Z`,
  ])
  assert.equal(
    (
      await query('select * from public.dues_invoices where period=$1', [
        `${futureYear}-01-01`,
      ])
    ).length,
    0,
  )
  await db.query('select app_private.generate_monthly_dues($1)', [
    `${futureYear - 1}-12-31T17:00:00Z`,
  ])
  assert.equal(
    (
      await query('select * from public.dues_invoices where period=$1', [
        `${futureYear}-01-01`,
      ])
    ).length,
    7,
  )
  await db.query('select app_private.generate_monthly_dues($1)', [
    `${futureYear}-02-01T00:00:00+07:00`,
  ])
  const feb = (
    await query(
      'select * from public.dues_invoices where resident_id=$1 and period=$2',
      [alice, `${futureYear}-02-01`],
    )
  )[0]
  const days = new Date(Date.UTC(futureYear, 2, 0)).getUTCDate()
  assert.equal(isoDate(feb.due_date), `${futureYear}-02-${days}`)
  const oldMonth = (
    await query(
      "select (activated_month-interval '1 month')::date::text period from public.dues_settings",
    )
  )[0].period
  await db.query('select app_private.generate_monthly_dues($1)', [
    `${oldMonth}T00:00:00+07:00`,
  ])
  assert.equal(
    (
      await query('select * from public.dues_invoices where period=$1', [
        oldMonth,
      ])
    ).length,
    0,
  )
  await db.query('update public.profiles set is_active=true where id=$1', [
    uid(5),
  ])
  assert.equal(isoDate((await invoiceFor(uid(5))).period), month)
})
