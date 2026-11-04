import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import type {
  ResidentProfile,
  ResidentRole,
} from '../../src/lib/database.types'
import type {
  Complaint,
  ComplaintEvent,
  ComplaintStatus,
} from '../../src/features/complaints/types'

const uid = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
type Options = {
  role?: ResidentRole
  empty?: boolean
  listFailure?: boolean
  listDelay?: number
  detailFailure?: boolean
  submitFailure?: boolean
  lostResponse?: boolean
  stale?: boolean
  reviewFailure?: boolean
}
async function mockComplaints(page: Page, options: Options = {}) {
  const role = options.role ?? 'warga'
  const manager = role !== 'warga'
  const currentId =
    role === 'ketua_rt' ? uid(1) : role === 'pengurus_rt' ? uid(2) : uid(3)
  const profile: ResidentProfile = {
    id: currentId,
    full_name: manager ? 'Pengurus Dummy' : 'Warga Dummy 3',
    email: 'dummy@example.test',
    role,
    nik: '0000000000000003',
    family_card_number: null,
    gender: null,
    marital_status: null,
    house_block: 'DUMMY-A',
    house_number: null,
    phone: '081234567890',
    address: 'Jalan Dummy Nomor 3',
    is_active: true,
    archived_at: null,
    verification_status: 'menunggu_verifikasi',
    reviewed_by: null,
    reviewed_at: null,
    review_note: null,
    created_by: null,
    created_at: '2026-11-03T00:00:00Z',
    updated_at: '2026-11-03T00:00:00Z',
  }
  const user = {
    id: currentId,
    aud: 'authenticated',
    role: 'authenticated',
    email: profile.email,
    email_confirmed_at: profile.created_at,
    created_at: profile.created_at,
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: {},
    identities: [],
  }
  const token = `${Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')}.${Buffer.from(JSON.stringify({ sub: currentId, role: 'authenticated', session_id: currentId.replace('8000', '9000'), exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.dummy-signature`
  const session = {
    access_token: token,
    refresh_token: 'dummy-refresh',
    token_type: 'bearer',
    expires_in: 3600,
    user,
  }
  let revision = 0
  const now = () =>
    new Date(Date.UTC(2026, 10, 4, 2, 0, ++revision)).toISOString()
  const complaints: Complaint[] = options.empty
    ? []
    : Array.from({ length: 12 }, (_, i) => ({
        id: uid(100 + i),
        number: i + 1,
        reference: `ADU-${String(i + 1).padStart(3, '0')}`,
        applicant_id: i % 2 ? uid(4) : uid(3),
        identity_snapshot: {
          full_name: `Warga Dummy ${i % 2 ? 4 : 3}`,
          house_block: 'DUMMY-A',
          house_number: '03',
        },
        title: `Lampu lingkungan dummy ${i + 1}`,
        description:
          'Lampu jalan dummy tidak menyala.\nLokasi di blok DUMMY-A.',
        category:
          i % 3 === 0
            ? 'fasilitas_umum'
            : i % 3 === 1
              ? 'keamanan'
              : 'kebersihan_sampah',
        status: (['diajukan', 'diproses', 'selesai', 'ditolak'] as const)[
          i % 4
        ],
        resolution_note:
          i % 4 === 2
            ? 'Lampu dummy sudah diperbaiki'
            : i % 4 === 3
              ? 'Lokasi dummy berada di luar RT'
              : '',
        created_at: new Date(Date.UTC(2026, 10, 3, 18 - i)).toISOString(),
        updated_at: '2026-11-03T00:00:00.000Z',
      }))
  const events: ComplaintEvent[] = []
  function record(
    c: Complaint,
    action: ComplaintEvent['action'],
    previous: ComplaintStatus | null,
    note = '',
    previousCategory = c.category,
  ) {
    events.push({
      id: events.length + 1,
      complaint_id: c.id,
      action,
      previous_status: previous,
      status: action === 'submitted' ? 'diajukan' : c.status,
      previous_category: action === 'submitted' ? null : previousCategory,
      category: c.category,
      note,
      actor_id: action === 'submitted' ? c.applicant_id : currentId,
      actor_name:
        action === 'submitted'
          ? c.identity_snapshot.full_name
          : profile.full_name,
      actor_role: action === 'submitted' ? 'warga' : role,
      occurred_at: action === 'submitted' ? c.created_at : now(),
    })
  }
  for (const c of complaints) record(c, 'submitted', null)
  const requests: { path: string; body: Record<string, unknown> }[] = []
  await page.route('http://127.0.0.1:54321/**', async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    const headers = {
      'access-control-allow-origin': '*',
      'access-control-expose-headers': 'x-supabase-api-version',
      'content-type': 'application/json',
      'x-supabase-api-version': '2024-01-01',
    }
    const respond = (json: unknown, status = 200) =>
      route.fulfill({ status, headers, json })
    if (request.method() === 'OPTIONS') return respond({})
    const body = request.postData()
      ? (request.postDataJSON() as Record<string, unknown>)
      : {}
    requests.push({ path, body })
    if (path.endsWith('/token')) return respond(session)
    if (path.endsWith('/user')) return respond(user)
    if (path.endsWith('/logout')) return route.fulfill({ status: 204, headers })
    if (path.endsWith('/profiles')) return respond([profile])
    if (path.endsWith('/resident_events')) return respond([])
    if (path.endsWith('/complaints_overview')) {
      if (options.listDelay)
        await new Promise((resolve) => setTimeout(resolve, options.listDelay))
      if (options.listFailure) return respond({ code: 'unavailable' }, 503)
      if (body.p_scope === 'all' && !manager)
        return respond({ code: '42501' }, 403)
      const rows = complaints
        .filter(
          (c) =>
            (body.p_scope === 'all' || c.applicant_id === currentId) &&
            (body.p_status === 'all' || c.status === body.p_status) &&
            (body.p_category === 'all' || c.category === body.p_category) &&
            (!body.p_from ||
              new Date(c.created_at) >=
                new Date(`${body.p_from}T00:00:00+07:00`)) &&
            (!body.p_to ||
              new Date(c.created_at) <
                new Date(
                  new Date(`${body.p_to}T00:00:00+07:00`).getTime() + 86400000,
                )) &&
            [
              c.title,
              c.reference,
              ...(body.p_scope === 'all'
                ? [c.identity_snapshot.full_name]
                : []),
            ].some((value) =>
              value
                .toLowerCase()
                .includes(String(body.p_search).trim().toLowerCase()),
            ),
        )
        .sort(
          (a, b) =>
            (body.p_sort === 'oldest'
              ? a.created_at.localeCompare(b.created_at)
              : b.created_at.localeCompare(a.created_at)) ||
            a.id.localeCompare(b.id),
        )
      const offset = (Number(body.p_page) - 1) * 4
      return respond({
        items: rows.slice(offset, offset + 4),
        total: rows.length,
        summary:
          body.p_scope === 'all'
            ? Object.fromEntries(
                ['diajukan', 'diproses', 'selesai', 'ditolak'].map((status) => [
                  status,
                  rows.filter((c) => c.status === status).length,
                ]),
              )
            : null,
      })
    }
    if (path.endsWith('/complaint_detail')) {
      if (options.detailFailure) return respond({ code: 'unavailable' }, 503)
      const c = complaints.find(
        (c) =>
          c.id === body.p_id &&
          (c.applicant_id === currentId || (body.p_scope === 'all' && manager)),
      )
      return c
        ? respond({
            complaint: c,
            events: events.filter((e) => e.complaint_id === c.id),
          })
        : respond({ code: 'P0002', message: 'COMPLAINT_NOT_FOUND' }, 404)
    }
    if (path.endsWith('/submit_complaint')) {
      if (options.submitFailure) {
        options.submitFailure = false
        return respond({ code: 'unavailable' }, 503)
      }
      let c = complaints.find((c) => c.id === body.p_request_id)
      if (!c) {
        c = {
          id: String(body.p_request_id),
          number: complaints.length + 1,
          reference: `ADU-${String(complaints.length + 1).padStart(3, '0')}`,
          applicant_id: currentId,
          identity_snapshot: {
            full_name: profile.full_name,
            house_block: profile.house_block,
            house_number: profile.house_number,
          },
          title: String(body.p_title),
          description: String(body.p_description),
          category: body.p_category as Complaint['category'],
          status: 'diajukan',
          resolution_note: '',
          created_at: now(),
          updated_at: now(),
        }
        complaints.push(c)
        record(c, 'submitted', null)
      }
      if (options.lostResponse) {
        options.lostResponse = false
        return respond({ code: 'unavailable' }, 503)
      }
      return respond(c)
    }
    if (path.endsWith('/review_complaint')) {
      if (!manager) return respond({ code: '42501' }, 403)
      const c = complaints.find((c) => c.id === body.p_id)!
      if (options.reviewFailure) {
        options.reviewFailure = false
        return respond({ code: 'unavailable' }, 503)
      }
      if (options.stale) {
        options.stale = false
        c.status = 'diproses'
        c.updated_at = now()
        return respond({ code: '40001' }, 409)
      }
      if (body.p_expected_updated_at !== c.updated_at)
        return respond({ code: '40001' }, 409)
      const previous = c.status,
        previousCategory = c.category
      c.category = body.p_category as Complaint['category']
      if (body.p_action !== 'recategorize')
        c.status =
          body.p_action === 'start'
            ? 'diproses'
            : body.p_action === 'complete'
              ? 'selesai'
              : 'ditolak'
      if (c.status === 'ditolak' || c.status === 'selesai')
        c.resolution_note = String(body.p_note)
      c.updated_at = now()
      record(
        c,
        body.p_action as ComplaintEvent['action'],
        previous,
        String(body.p_note),
        previousCategory,
      )
      return respond({
        complaint: c,
        events: events.filter((e) => e.complaint_id === c.id),
      })
    }
    return respond({}, 404)
  })
  await page.goto('/login')
  await page.getByLabel('Email', { exact: true }).fill(profile.email)
  await page.getByLabel('Password', { exact: true }).fill('DummyPassword123!')
  await page.getByRole('button', { name: 'Masuk', exact: true }).click()
  await expect(page).toHaveURL(/\/warga$/)
  return { complaints, events, requests, options }
}
const detailDialog = (page: Page) =>
  page.getByRole('dialog', { name: 'Detail Pengaduan', exact: true })
async function openForm(page: Page) {
  await page.goto('/warga/pengaduan')
  await page.getByRole('link', { name: 'Buat Pengaduan', exact: true }).click()
  return page.getByRole('dialog', { name: 'Buat Pengaduan', exact: true })
}

test('unverified resident submits with validation, immutable identity and private detail', async ({
  page,
}) => {
  const state = await mockComplaints(page)
  const form = await openForm(page)
  for (const label of ['Nama pengaju', 'Blok rumah', 'Nomor rumah'])
    await expect(form.getByLabel(label, { exact: true })).toHaveCount(0)
  await form
    .getByRole('button', { name: 'Kirim Pengaduan', exact: true })
    .click()
  await expect(
    form.getByLabel('Judul pengaduan', { exact: true }),
  ).toBeFocused()
  await expect(
    form.getByText('Pilih kategori pengaduan.', { exact: true }),
  ).toBeVisible()
  await form
    .getByLabel('Judul pengaduan', { exact: true })
    .fill('Lampu di taman dummy')
  await form
    .getByLabel('Kategori pengaduan', { exact: true })
    .selectOption('fasilitas_umum')
  await form
    .getByLabel('Deskripsi pengaduan', { exact: true })
    .fill('Lampu taman dummy padam sejak malam.')
  await form
    .getByRole('button', { name: 'Kirim Pengaduan', exact: true })
    .click()
  const detail = detailDialog(page)
  await expect(detail.getByRole('status')).toContainText(
    'Pengaduan berhasil dikirim',
  )
  await expect(
    detail.getByText('Lampu di taman dummy', { exact: true }),
  ).toBeVisible()
  await expect(
    detail.getByRole('button', { name: 'Mulai Proses', exact: true }),
  ).toHaveCount(0)
  await expect(detail.getByRole('textbox')).toHaveCount(0)
  expect(state.complaints).toHaveLength(13)
  const sent = state.requests.find((r) =>
    r.path.endsWith('/submit_complaint'),
  )!.body
  expect(sent).not.toHaveProperty('applicant_id')
  expect(sent).not.toHaveProperty('status')
  await detail.getByRole('button', { name: 'Tutup', exact: true }).click()
  await page.goto(`/warga/pengaduan/${uid(101)}`)
  await expect(detailDialog(page).getByRole('alert')).toContainText(
    'tidak ditemukan',
  )
  await page.goto('/admin/pengaduan')
  await expect(
    page.getByRole('heading', { name: 'Akses ditolak', exact: true }),
  ).toBeVisible()
})

for (const role of ['ketua_rt', 'pengurus_rt'] as const)
  test(`${role} recategorizes, starts and completes; personal scope remains separate`, async ({
    page,
  }) => {
    const state = await mockComplaints(page, { role })
    await page.goto('/admin/pengaduan')
    await expect(
      page.getByRole('link', { name: 'Pengaduan', exact: true }),
    ).toHaveAttribute('aria-current', 'page')
    await page
      .getByRole('link', { name: 'Lihat pengaduan ADU-001', exact: true })
      .click()
    const detail = detailDialog(page)
    await detail
      .getByLabel('Kategori pengaduan', { exact: true })
      .selectOption('keamanan')
    await detail
      .getByRole('button', { name: 'Simpan kategori', exact: true })
      .click()
    await expect(
      detail.getByText('Kategori diperbaiki', { exact: true }),
    ).toBeVisible()
    await detail
      .getByLabel('Catatan penanganan', { exact: true })
      .fill('Pengurus memeriksa lokasi dummy')
    await detail
      .getByRole('button', { name: 'Mulai Proses', exact: true })
      .click()
    await expect(
      detail.getByRole('button', { name: 'Selesaikan', exact: true }),
    ).toBeEnabled()
    await detail
      .getByRole('button', { name: 'Selesaikan', exact: true })
      .click()
    await expect(
      detail.getByText('Isi hasil penanganan.', { exact: true }),
    ).toBeVisible()
    await detail
      .getByLabel('Catatan penanganan', { exact: true })
      .fill('Lampu dummy sudah diganti')
    await detail
      .getByRole('button', { name: 'Selesaikan', exact: true })
      .click()
    await expect(
      detail.getByRole('region', { name: 'Hasil penanganan', exact: true }),
    ).toContainText('Lampu dummy sudah diganti')
    await expect(
      detail.getByLabel('Catatan penanganan', { exact: true }),
    ).toHaveCount(0)
    expect(
      state.events.filter((e) => e.complaint_id === uid(100)),
    ).toHaveLength(4)
    await detail.getByRole('button', { name: 'Tutup', exact: true }).click()
    await page
      .getByRole('link', { name: 'Pengaduan saya', exact: true })
      .click()
    await expect(
      page.getByRole('heading', { name: 'Belum ada pengaduan', exact: true }),
    ).toBeVisible()
    await page.goto(`/warga/pengaduan/${uid(100)}`)
    await expect(detailDialog(page).getByRole('alert')).toContainText(
      'tidak ditemukan',
    )
  })

for (const n of [100, 101])
  test(`reject ${n} requires reason, names complaint and supports cancelling confirmation`, async ({
    page,
  }) => {
    const state = await mockComplaints(page, { role: 'ketua_rt' })
    await page.goto(`/admin/pengaduan/${uid(n)}`)
    const detail = detailDialog(page)
    await detail
      .getByRole('button', { name: 'Tolak Pengaduan', exact: true })
      .click()
    await expect(
      detail.getByText('Isi alasan penolakan.', { exact: true }),
    ).toBeVisible()
    await detail
      .getByLabel('Catatan penanganan', { exact: true })
      .fill('Lokasi dummy berada di luar RT')
    await detail
      .getByRole('button', { name: 'Tolak Pengaduan', exact: true })
      .click()
    const confirm = page.getByRole('dialog', {
      name: 'Tolak Pengaduan',
      exact: true,
    })
    await expect(confirm).toContainText(`Lampu lingkungan dummy ${n - 99}`)
    await page.keyboard.press('Escape')
    await expect(confirm).not.toBeVisible()
    await expect(
      detail.getByRole('button', { name: 'Tolak Pengaduan', exact: true }),
    ).toBeFocused()
    expect(
      state.requests.filter((r) => r.path.endsWith('/review_complaint')),
    ).toHaveLength(0)
    await detail
      .getByRole('button', { name: 'Tolak Pengaduan', exact: true })
      .click()
    await confirm
      .getByRole('button', { name: 'Ya, Tolak Pengaduan', exact: true })
      .click()
    await expect(
      detail.getByRole('region', { name: 'Alasan penolakan', exact: true }),
    ).toContainText('Lokasi dummy berada di luar RT')
    await expect(
      detail.getByRole('button', { name: 'Tolak Pengaduan', exact: true }),
    ).toHaveCount(0)
  })

test('filter URL, Jakarta date range, pagination and unpaginated summary agree', async ({
  page,
}) => {
  const state = await mockComplaints(page, { role: 'ketua_rt' })
  await page.goto('/admin/pengaduan')
  await expect(
    page.getByText('Menampilkan 1–4 dari 12 pengaduan', { exact: true }),
  ).toBeVisible()
  const summary = page.getByRole('region', {
    name: 'Ringkasan pengaduan',
    exact: true,
  })
  await expect(summary.locator('dd')).toHaveText(['3', '3', '3', '3'])
  await page
    .getByRole('button', { name: 'Halaman berikutnya', exact: true })
    .click()
  await expect(
    page.getByText('Menampilkan 5–8 dari 12 pengaduan', { exact: true }),
  ).toBeVisible()
  await expect(summary.locator('dd')).toHaveText(['3', '3', '3', '3'])
  await page
    .getByRole('link', { name: 'Lihat pengaduan ADU-005', exact: true })
    .click()
  await detailDialog(page)
    .getByRole('button', { name: 'Tutup', exact: true })
    .click()
  await expect(detailDialog(page)).not.toBeVisible()
  await expect(page).toHaveURL('/admin/pengaduan?page=2')
  await page
    .getByLabel('Kategori', { exact: true })
    .selectOption('fasilitas_umum')
  await expect(
    page.getByText('Menampilkan 1–4 dari 4 pengaduan', { exact: true }),
  ).toBeVisible()
  await expect(summary.locator('dd')).toHaveText(['1', '1', '1', '1'])
  await page.getByLabel('Status', { exact: true }).selectOption('diajukan')
  await expect(summary.locator('dd')).toHaveText(['1', '0', '0', '0'])
  await page.getByRole('button', { name: 'Hapus filter', exact: true }).click()
  await page.getByLabel('Dari tanggal', { exact: true }).fill('2026-11-04')
  await page.getByLabel('Sampai tanggal', { exact: true }).fill('2026-11-04')
  await expect(
    page.getByText('Menampilkan 1–2 dari 2 pengaduan', { exact: true }),
  ).toBeVisible()
  await expect(summary.locator('dd')).toHaveText(['1', '1', '0', '0'])
  await page.getByLabel('Dari tanggal', { exact: true }).fill('2026-11-05')
  await expect(
    page.getByText('Tanggal akhir harus sama atau setelah tanggal awal.', {
      exact: true,
    }),
  ).toBeVisible()
  const count = state.requests.filter((r) =>
    r.path.endsWith('/complaints_overview'),
  ).length
  await page.getByLabel('Sampai tanggal', { exact: true }).fill('2026-11-06')
  await expect
    .poll(
      () =>
        state.requests.filter((r) => r.path.endsWith('/complaints_overview'))
          .length,
    )
    .toBeGreaterThan(count)
  await page.getByRole('button', { name: 'Hapus filter', exact: true }).click()
  await page.getByLabel('Cari pengaduan', { exact: true }).fill('Warga Dummy 4')
  await expect(
    page.getByText('dari 6 pengaduan', { exact: false }),
  ).toBeVisible()
  await page.getByLabel('Urutan', { exact: true }).selectOption('oldest')
  await expect(page.getByRole('row').nth(1)).toContainText('ADU-012')
  await page.getByLabel('Cari pengaduan', { exact: true }).fill('tidak-ada')
  await expect(
    page.getByRole('heading', {
      name: 'Pengaduan tidak ditemukan',
      exact: true,
    }),
  ).toBeVisible()
  await expect(summary.locator('dd')).toHaveText(['0', '0', '0', '0'])
})

test('failed and lost submissions preserve input and reuse request ID without duplicates', async ({
  page,
}) => {
  const state = await mockComplaints(page, {
    submitFailure: true,
    lostResponse: true,
  })
  const form = await openForm(page)
  await form
    .getByLabel('Judul pengaduan', { exact: true })
    .fill('Pengujian pengiriman ulang')
  await form
    .getByLabel('Kategori pengaduan', { exact: true })
    .selectOption('keamanan')
  await form
    .getByLabel('Deskripsi pengaduan', { exact: true })
    .fill('Deskripsi dummy tetap tersimpan')
  for (let i = 0; i < 2; i++) {
    await form
      .getByRole('button', { name: 'Kirim Pengaduan', exact: true })
      .click()
    await expect
      .poll(
        () =>
          state.requests.filter((r) => r.path.endsWith('/submit_complaint'))
            .length,
      )
      .toBe(i + 1)
    await expect(form.getByRole('alert')).toContainText(
      'Permintaan belum berhasil',
    )
    await expect(
      form.getByLabel('Deskripsi pengaduan', { exact: true }),
    ).toHaveValue('Deskripsi dummy tetap tersimpan')
  }
  await form
    .getByRole('button', { name: 'Kirim Pengaduan', exact: true })
    .click()
  await expect(detailDialog(page)).toBeVisible()
  expect(
    new Set(
      state.requests
        .filter((r) => r.path.endsWith('/submit_complaint'))
        .map((r) => r.body.p_request_id),
    ).size,
  ).toBe(1)
  expect(state.complaints).toHaveLength(13)
  expect(
    state.events.filter((e) => e.complaint_id === state.complaints.at(-1)!.id),
  ).toHaveLength(1)
})

test('stale mutation requires refresh; network failure retains handling note', async ({
  page,
}) => {
  const state = await mockComplaints(page, { role: 'pengurus_rt', stale: true })
  await page.goto(`/admin/pengaduan/${uid(100)}`)
  const detail = detailDialog(page)
  await detail
    .getByRole('button', { name: 'Mulai Proses', exact: true })
    .click()
  await expect(detail.getByRole('alert')).toContainText(
    'telah diubah pengurus lain',
  )
  await expect(
    detail.getByRole('button', { name: 'Mulai Proses', exact: true }),
  ).toBeDisabled()
  await detail
    .getByRole('button', { name: 'Muat ulang detail', exact: true })
    .click()
  await expect(
    detail.getByRole('button', { name: 'Selesaikan', exact: true }),
  ).toBeEnabled()
  state.options.reviewFailure = true
  await detail
    .getByLabel('Catatan penanganan', { exact: true })
    .fill('Hasil dummy tetap tersimpan')
  await detail.getByRole('button', { name: 'Selesaikan', exact: true }).click()
  await expect(detail.getByRole('alert')).toContainText(
    'Permintaan belum berhasil',
  )
  await expect(
    detail.getByLabel('Catatan penanganan', { exact: true }),
  ).toHaveValue('Hasil dummy tetap tersimpan')
  await detail.getByRole('button', { name: 'Selesaikan', exact: true }).click()
  await expect(
    detail.getByRole('region', { name: 'Hasil penanganan', exact: true }),
  ).toContainText('Hasil dummy tetap tersimpan')
})

test('loading, list/detail failures and empty states allow recovery', async ({
  page,
}) => {
  const state = await mockComplaints(page, {
    empty: true,
    listFailure: true,
    listDelay: 500,
  })
  await page.goto('/warga/pengaduan')
  await expect(page.getByRole('status')).toContainText('Memuat pengaduan')
  await expect(page.getByRole('alert')).toBeVisible()
  state.options.listFailure = false
  state.options.listDelay = 0
  await page
    .getByRole('button', { name: 'Coba lagi pengaduan', exact: true })
    .click()
  await expect(
    page.getByRole('heading', { name: 'Belum ada pengaduan', exact: true }),
  ).toBeVisible()
  state.options.detailFailure = true
  await page.goto(`/warga/pengaduan/${uid(100)}`)
  await expect(detailDialog(page).getByRole('alert')).toContainText(
    'Permintaan belum berhasil',
  )
  state.options.detailFailure = false
  await detailDialog(page)
    .getByRole('button', { name: 'Coba lagi detail', exact: true })
    .click()
  await expect(detailDialog(page).getByRole('alert')).toContainText(
    'tidak ditemukan',
  )
})

test('responsive layouts, keyboard dialogs and mobile navigation work', async ({
  page,
}, testInfo) => {
  await mockComplaints(page, { role: 'ketua_rt' })
  for (const width of [360, 375, 768, 1280, 1648]) {
    await page.setViewportSize({ width, height: 1056 })
    await page.goto('/admin/pengaduan')
    await expect(page.getByRole('table')).toBeVisible()
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true)
    await page.screenshot({
      path: testInfo.outputPath(`complaints-list-${width}.png`),
      fullPage: true,
    })
    await page
      .getByRole('link', { name: 'Lihat pengaduan ADU-001', exact: true })
      .click()
    const detail = detailDialog(page)
    await expect(detail).toBeVisible()
    expect(
      await detail.evaluate((node) => node.scrollWidth <= node.clientWidth),
    ).toBe(true)
    await page.screenshot({
      path: testInfo.outputPath(`complaints-detail-${width}.png`),
    })
    await page.keyboard.press('Escape')
    await expect(detail).not.toBeVisible()
    await expect(
      page.getByRole('link', { name: 'Lihat pengaduan ADU-001', exact: true }),
    ).toBeFocused()
    await page.goto('/warga/pengaduan')
    await page
      .getByRole('link', { name: 'Buat Pengaduan', exact: true })
      .click()
    const form = page.getByRole('dialog', {
      name: 'Buat Pengaduan',
      exact: true,
    })
    await expect(form).toBeVisible()
    expect(
      await form.evaluate((node) => node.scrollWidth <= node.clientWidth),
    ).toBe(true)
    await expect(
      form.getByLabel('Judul pengaduan', { exact: true }),
    ).toHaveAttribute('maxlength', '200')
    await expect(
      form.getByLabel('Deskripsi pengaduan', { exact: true }),
    ).toHaveAttribute('maxlength', '2000')
    await page.screenshot({
      path: testInfo.outputPath(`complaints-form-${width}.png`),
    })
    await page.keyboard.press('Escape')
    await expect(
      page.getByRole('link', { name: 'Buat Pengaduan', exact: true }),
    ).toBeFocused()
  }
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/warga')
  await page
    .getByRole('button', { name: 'Buka menu navigasi', exact: true })
    .click()
  const menu = page.getByRole('dialog', { name: 'Menu navigasi', exact: true })
  await menu.getByRole('link', { name: 'Pengaduan', exact: true }).click()
  await expect(menu).not.toBeVisible()
  await expect(page).toHaveURL('/admin/pengaduan')
})
