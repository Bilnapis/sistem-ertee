import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import type {
  ResidentProfile,
  ResidentRole,
} from '../../src/lib/database.types'
import type { Announcement } from '../../src/features/announcements/types'
const uid = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
type Options = {
  role?: ResidentRole
  empty?: boolean
  listFailure?: boolean
  detailFailure?: boolean
  submitFailure?: boolean
  lostResponse?: boolean
  stale?: boolean
  serverOffset?: number
}
async function mockAnnouncements(page: Page, options: Options = {}) {
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
  const token = `${Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')}.${Buffer.from(JSON.stringify({ sub: currentId, role: 'authenticated', session_id: currentId.replace('8000', '9000'), exp: Math.floor(Date.parse('2099-01-01T00:00:00Z') / 1000) })).toString('base64url')}.dummy-signature`
  const session = {
    access_token: token,
    refresh_token: 'dummy-refresh',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.parse('2099-01-01T00:00:00Z') / 1000),
    user,
  }
  const base = Date.now() + (options.serverOffset ?? 0)
  const iso = (offset: number) => new Date(base + offset).toISOString()
  let revision = 0
  const announcements: Announcement[] = options.empty
    ? []
    : Array.from({ length: 8 }, (_, i) => ({
        id: uid(100 + i),
        title: `Kegiatan RT ${i + 1}`,
        description: `Informasi kegiatan dummy ${i + 1}.\nBaris kedua tetap tampil.`,
        starts_at: iso(-(i + 1) * 3600000),
        ends_at: iso(86400000),
        created_by: uid(1),
        updated_by: uid(1),
        archived_at: null,
        created_at: iso(-86400000),
        updated_at: iso(-86400000),
      }))
  announcements.push(
    ...(options.empty
      ? []
      : [
          {
            ...announcements[0],
            id: uid(200),
            title: 'Pengumuman mendatang',
            starts_at: iso(3600000),
            ends_at: iso(7200000),
          },
          {
            ...announcements[0],
            id: uid(201),
            title: 'Pengumuman selesai',
            starts_at: iso(-7200000),
            ends_at: iso(-3600000),
          },
          {
            ...announcements[0],
            id: uid(202),
            title: 'Pengumuman arsip',
            archived_at: iso(-3600000),
          },
        ]),
  )
  const requests: { path: string; body: Record<string, unknown> }[] = []
  await page.route('http://127.0.0.1:54321/**', async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    const headers = {
      'access-control-allow-origin': '*',
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
    const now =
      (await page.evaluate(() => Date.now())) + (options.serverOffset ?? 0)
    const status = (a: Announcement) =>
      a.archived_at
        ? 'archived'
        : Date.parse(a.starts_at) > now
          ? 'scheduled'
          : Date.parse(a.ends_at) <= now
            ? 'ended'
            : 'active'
    const nextChange = (rows: Announcement[]) =>
      rows
        .filter((a) => !a.archived_at)
        .flatMap((a) => [a.starts_at, a.ends_at])
        .filter((t) => Date.parse(t) > now)
        .sort()[0] ?? null
    if (path.endsWith('/announcements_overview')) {
      if (options.listFailure) return respond({ code: 'unavailable' }, 503)
      if (body.p_scope === 'manage' && !manager)
        return respond({ code: '42501' }, 403)
      const rows = announcements
        .filter(
          (a) =>
            (body.p_scope === 'manage' || status(a) === 'active') &&
            (body.p_status === 'all' || status(a) === body.p_status) &&
            a.title
              .toLowerCase()
              .includes(String(body.p_search).trim().toLowerCase()),
        )
        .sort(
          (a, b) =>
            b.starts_at.localeCompare(a.starts_at) || a.id.localeCompare(b.id),
        )
      const offset = (Number(body.p_page) - 1) * Number(body.p_page_size)
      return respond({
        items: rows.slice(offset, offset + Number(body.p_page_size)),
        total: rows.length,
        server_now: new Date(now).toISOString(),
        next_change_at: nextChange(announcements),
      })
    }
    if (path.endsWith('/announcement_detail')) {
      if (options.detailFailure) return respond({ code: 'unavailable' }, 503)
      if (body.p_scope === 'manage' && !manager)
        return respond({ code: '42501' }, 403)
      const a = announcements.find(
        (a) =>
          a.id === body.p_id &&
          (body.p_scope === 'manage' || status(a) === 'active'),
      )
      return a
        ? respond({
            announcement: a,
            server_now: new Date(now).toISOString(),
            next_change_at: nextChange([a]),
          })
        : respond({ code: 'P0002' }, 404)
    }
    if (!manager) return respond({ code: '42501' }, 403)
    if (path.endsWith('/create_announcement')) {
      if (options.submitFailure) {
        options.submitFailure = false
        return respond({ code: 'unavailable' }, 503)
      }
      let a = announcements.find((a) => a.id === body.p_request_id)
      if (!a) {
        a = {
          id: String(body.p_request_id),
          title: String(body.p_title),
          description: String(body.p_description),
          starts_at: String(body.p_starts_at),
          ends_at: String(body.p_ends_at),
          created_by: currentId,
          updated_by: currentId,
          archived_at: null,
          created_at: new Date(now).toISOString(),
          updated_at: new Date(now + ++revision).toISOString(),
        }
        announcements.push(a)
      }
      if (options.lostResponse) {
        options.lostResponse = false
        return respond({ code: 'unavailable' }, 503)
      }
      return respond(a)
    }
    if (
      path.endsWith('/update_announcement') ||
      path.endsWith('/archive_announcement')
    ) {
      const a = announcements.find((a) => a.id === body.p_id)!
      if (options.stale) {
        options.stale = false
        a.title = 'Diperbarui admin lain'
        a.updated_at = new Date(now + ++revision).toISOString()
        return respond({ code: 'PT409' }, 409)
      }
      if (body.p_expected_updated_at !== a.updated_at)
        return respond({ code: 'PT409' }, 409)
      if (path.endsWith('/archive_announcement'))
        a.archived_at = new Date(now).toISOString()
      else
        Object.assign(a, {
          title: body.p_title,
          description: body.p_description,
          starts_at: body.p_starts_at,
          ends_at: body.p_ends_at,
          archived_at: null,
        })
      a.updated_by = currentId
      a.updated_at = new Date(now + ++revision).toISOString()
      return respond(a)
    }
    return respond({}, 404)
  })
  await page.addInitScript(
    (session) =>
      localStorage.setItem('sb-127-auth-token', JSON.stringify(session)),
    session,
  )
  return { announcements, requests, options }
}

const detailDialog = (page: Page) =>
  page.getByRole('dialog', { name: 'Detail Pengumuman', exact: true })
async function fillForm(page: Page, title = 'Kerja bakti akhir pekan') {
  const form = page.getByRole('dialog').last()
  await form.getByLabel('Judul', { exact: true }).fill(title)
  await form
    .getByLabel('Deskripsi', { exact: true })
    .fill('Berkumpul di pos RT.\nBawa alat kebersihan.')
  await form
    .getByLabel('Mulai tayang (WIB)', { exact: true })
    .fill('2099-11-05T07:30')
  await form
    .getByLabel('Selesai tayang (WIB)', { exact: true })
    .fill('2099-11-06T08:30')
  return form
}

for (const role of ['warga', 'ketua_rt', 'pengurus_rt'] as const) {
  test(`${role} opens announcements from the dashboard and can read all`, async ({
    page,
  }) => {
    await mockAnnouncements(page, { role })
    await page.goto('/warga')
    await expect(
      page.getByRole('heading', { name: 'Dashboard', exact: true }),
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Profil warga' }),
    ).toHaveCount(0)
    await page
      .getByRole('link', { name: 'Lihat Pengumuman', exact: true })
      .click()
    await expect(page).toHaveURL('/warga/pengumuman')
    await expect(page.locator('article')).toHaveCount(4)
    await page.getByRole('button', { name: 'Berikutnya', exact: true }).click()
    await expect(page).toHaveURL(/page=2/)
    await expect(page.locator('article h3').first()).toHaveText('Kegiatan RT 5')
    await page
      .getByRole('searchbox', { name: 'Cari pengumuman' })
      .fill('Kegiatan RT 8')
    await expect(page.locator('article')).toHaveCount(1)
    await page
      .getByRole('link', { name: 'Baca selengkapnya: Kegiatan RT 8' })
      .click()
    await expect(
      detailDialog(page).getByText('Baris kedua tetap tampil.', {
        exact: false,
      }),
    ).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(detailDialog(page)).toHaveCount(0)
    await page.goto('/warga/profil')
    await expect(
      page.getByRole('region', { name: 'Pengumuman', exact: true }),
    ).toHaveCount(0)
  })
}

for (const role of ['ketua_rt', 'pengurus_rt'] as const) {
  test(`${role} validates, creates, edits, archives and republishes`, async ({
    page,
  }) => {
    const state = await mockAnnouncements(page, { role })
    await page.goto('/admin/pengumuman')
    await page
      .getByRole('link', { name: 'Buat Pengumuman', exact: true })
      .click()
    const form = page.getByRole('dialog', {
      name: 'Buat Pengumuman',
      exact: true,
    })
    await form
      .getByRole('button', { name: 'Simpan Pengumuman', exact: true })
      .click()
    await expect(form.getByLabel('Judul', { exact: true })).toBeFocused()
    await fillForm(page)
    await form.getByLabel('Selesai tayang (WIB)').fill('2099-11-04T08:30')
    await form
      .getByRole('button', { name: 'Simpan Pengumuman', exact: true })
      .click()
    await expect(form.getByLabel('Selesai tayang (WIB)')).toBeFocused()
    await form.getByLabel('Selesai tayang (WIB)').fill('2099-11-06T08:30')
    await form
      .getByRole('button', { name: 'Simpan Pengumuman', exact: true })
      .click()
    let detail = detailDialog(page)
    await expect(
      detail.getByText('Pengumuman berhasil disimpan.', { exact: true }),
    ).toBeVisible()
    await expect(detail.getByText('Terjadwal', { exact: true })).toBeVisible()
    await detail
      .getByRole('link', { name: 'Edit Pengumuman', exact: true })
      .click()
    const editor = page.getByRole('dialog', {
      name: 'Edit Pengumuman',
      exact: true,
    })
    await editor
      .getByLabel('Judul', { exact: true })
      .fill('Kerja bakti diperbarui')
    await editor
      .getByRole('button', { name: 'Simpan Pengumuman', exact: true })
      .click()
    detail = detailDialog(page)
    await expect(
      detail.getByRole('heading', {
        name: 'Kerja bakti diperbarui',
        exact: true,
      }),
    ).toBeVisible()
    await detail.getByRole('button', { name: 'Arsipkan', exact: true }).click()
    const confirm = page.getByRole('dialog', {
      name: 'Arsipkan Pengumuman',
      exact: true,
    })
    await expect(confirm).toContainText('“Kerja bakti diperbarui”')
    await page.keyboard.press('Escape')
    await expect(confirm).toHaveCount(0)
    await expect(
      detail.getByRole('button', { name: 'Arsipkan', exact: true }),
    ).toBeFocused()
    await detail.getByRole('button', { name: 'Arsipkan', exact: true }).click()
    await page
      .getByRole('button', { name: 'Ya, arsipkan', exact: true })
      .click()
    await expect(detail.getByText('Diarsipkan', { exact: true })).toBeVisible()
    await detail
      .getByRole('link', { name: 'Tayangkan ulang', exact: true })
      .click()
    const republish = page.getByRole('dialog', {
      name: 'Tayangkan Ulang Pengumuman',
      exact: true,
    })
    await expect(republish.getByLabel('Judul', { exact: true })).toHaveValue(
      'Kerja bakti diperbarui',
    )
    await republish
      .getByRole('button', { name: 'Simpan dan tayangkan ulang', exact: true })
      .click()
    await expect(
      detailDialog(page).getByText('Terjadwal', { exact: true }),
    ).toBeVisible()
    expect(
      state.announcements.find((a) => a.title === 'Kerja bakti diperbarui')
        ?.archived_at,
    ).toBeNull()
    const create = state.requests.find((r) =>
      r.path.endsWith('/create_announcement'),
    )!
    expect(create.body.p_starts_at).toBe('2099-11-05T00:30:00.000Z')
  })
}

test('residents cannot open management or nonactive details', async ({
  page,
}) => {
  await mockAnnouncements(page)
  await page.goto('/admin/pengumuman/tambah')
  await expect(
    page.getByRole('heading', { name: 'Akses ditolak' }),
  ).toBeVisible()
  for (const n of [200, 201, 202]) {
    await page.goto(`/warga/pengumuman/${uid(n)}`)
    await expect(detailDialog(page).getByRole('alert')).toContainText(
      'tidak ditemukan',
    )
  }
})

test('lost response retry preserves input and request ID without duplicate announcements', async ({
  page,
}) => {
  const state = await mockAnnouncements(page, {
    role: 'pengurus_rt',
    lostResponse: true,
  })
  await page.goto('/admin/pengumuman/tambah')
  const form = await fillForm(page)
  await form
    .getByRole('button', { name: 'Simpan Pengumuman', exact: true })
    .click()
  await expect(form.getByRole('alert')).toContainText('Periksa koneksi')
  await expect(form.getByLabel('Judul', { exact: true })).toHaveValue(
    'Kerja bakti akhir pekan',
  )
  await form
    .getByRole('button', { name: 'Simpan Pengumuman', exact: true })
    .click()
  await expect(detailDialog(page)).toBeVisible()
  const calls = state.requests.filter((r) =>
    r.path.endsWith('/create_announcement'),
  )
  expect(calls).toHaveLength(2)
  expect(calls[0].body.p_request_id).toBe(calls[1].body.p_request_id)
  expect(
    state.announcements.filter((a) => a.title === 'Kerja bakti akhir pekan'),
  ).toHaveLength(1)
})

test('stale edit keeps input, blocks resubmission and permits explicit reload', async ({
  page,
}) => {
  await mockAnnouncements(page, { role: 'ketua_rt', stale: true })
  await page.goto(`/admin/pengumuman/${uid(100)}/edit`)
  const form = page.getByRole('dialog', {
    name: 'Edit Pengumuman',
    exact: true,
  })
  await form.getByLabel('Judul', { exact: true }).fill('Masukan saya')
  await form
    .getByRole('button', { name: 'Simpan Pengumuman', exact: true })
    .click()
  await expect(form.getByRole('alert')).toContainText('diubah admin lain')
  await expect(form.getByLabel('Judul', { exact: true })).toHaveValue(
    'Masukan saya',
  )
  await expect(
    form.getByRole('button', { name: 'Simpan Pengumuman', exact: true }),
  ).toBeDisabled()
  await form
    .getByRole('button', { name: 'Muat ulang data dan formulir', exact: true })
    .click()
  await expect(form.getByLabel('Judul', { exact: true })).toHaveValue(
    'Diperbarui admin lain',
  )
  await form
    .getByRole('button', { name: 'Simpan Pengumuman', exact: true })
    .click()
  await expect(detailDialog(page)).toBeVisible()
})

test('background detail failures preserve the editor and its original version', async ({
  page,
}) => {
  await page.clock.install({ time: new Date() })
  const state = await mockAnnouncements(page, { role: 'pengurus_rt' })
  await page.goto(`/admin/pengumuman/${uid(100)}/edit`)
  const form = page.getByRole('dialog', {
    name: 'Edit Pengumuman',
    exact: true,
  })
  await form.getByLabel('Judul', { exact: true }).fill('Masukan tetap tersedia')
  state.options.detailFailure = true
  await page.clock.fastForward(61000)
  await expect(form.getByRole('alert')).toContainText(
    'Masukan Anda tetap tersedia',
  )
  await expect(form.getByLabel('Judul', { exact: true })).toHaveValue(
    'Masukan tetap tersedia',
  )
  state.options.detailFailure = false
  await form
    .getByRole('button', { name: 'Simpan Pengumuman', exact: true })
    .click()
  await expect(
    detailDialog(page).getByRole('heading', {
      name: 'Masukan tetap tersedia',
      exact: true,
    }),
  ).toBeVisible()
})

test('announcements recover via retry and show an empty feed', async ({
  page,
}) => {
  const state = await mockAnnouncements(page, { listFailure: true })
  await page.goto('/warga/pengumuman')
  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Pengumuman' })).toBeVisible()
  state.options.listFailure = false
  await page.getByRole('button', { name: 'Coba lagi', exact: true }).click()
  await expect(page.locator('article')).toHaveCount(4)
  state.announcements.splice(0)
  await page.goto('/warga/pengumuman')
  await expect(
    page.getByText(
      'Belum ada pengumuman yang sedang tayang atau sesuai pencarian.',
    ),
  ).toBeVisible()
})

test('schedule boundaries update announcements without reload and hide expired detail during a failed refresh', async ({
  page,
}) => {
  await page.clock.install({ time: new Date() })
  const state = await mockAnnouncements(page)
  const now = await page.evaluate(() => Date.now())
  state.announcements.splice(0, state.announcements.length, {
    ...state.announcements[0],
    starts_at: new Date(now + 5000).toISOString(),
    ends_at: new Date(now + 15000).toISOString(),
  })
  await page.goto('/warga/pengumuman')
  await expect(page.locator('article')).toHaveCount(0)
  await page.clock.fastForward(6000)
  await expect(page.locator('article')).toHaveCount(1)
  await page
    .getByRole('link', { name: 'Baca selengkapnya: Kegiatan RT 1' })
    .click()
  await expect(
    detailDialog(page).getByRole('heading', {
      name: 'Kegiatan RT 1',
      exact: true,
    }),
  ).toBeVisible()
  state.options.listFailure = true
  await page.clock.fastForward(10000)
  await expect(
    detailDialog(page).getByRole('heading', {
      name: 'Kegiatan RT 1',
      exact: true,
    }),
  ).toHaveCount(0)
  await expect(page.locator('article')).toHaveCount(0)
})

test('polling detects archive by another admin without a page reload', async ({
  page,
}) => {
  await page.clock.install({ time: new Date() })
  const state = await mockAnnouncements(page)
  await page.goto('/warga/pengumuman')
  await expect(page.locator('article h3').first()).toHaveText('Kegiatan RT 1')
  state.announcements[0].archived_at = new Date().toISOString()
  await page.clock.fastForward(61000)
  await expect(page.locator('article h3').first()).toHaveText('Kegiatan RT 2')
})

test('window focus immediately checks changes made by another admin', async ({
  page,
}) => {
  const state = await mockAnnouncements(page)
  await page.goto('/warga/pengumuman')
  await expect(page.locator('article h3').first()).toHaveText('Kegiatan RT 1')
  state.announcements[0].archived_at = new Date().toISOString()
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await expect(page.locator('article h3').first()).toHaveText('Kegiatan RT 2')
})

test('server time overrides an inaccurate browser wall clock', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2040-01-01T00:00:00Z') })
  const state = await mockAnnouncements(page, {
    empty: true,
    serverOffset: -10 * 365 * 86400000,
  })
  const now =
    (await page.evaluate(() => Date.now())) + state.options.serverOffset!
  state.announcements.push({
    id: uid(100),
    title: 'Jam server menjadi acuan',
    description: 'Informasi dummy',
    starts_at: new Date(now - 10000).toISOString(),
    ends_at: new Date(now + 10000).toISOString(),
    archived_at: null,
    created_by: uid(1),
    updated_by: uid(1),
    created_at: new Date(now).toISOString(),
    updated_at: new Date(now).toISOString(),
  })
  await page.goto('/warga/pengumuman')
  await expect(page.locator('article')).toHaveCount(1)
  await page.clock.fastForward(11000)
  await expect(page.locator('article')).toHaveCount(0)
})

test('WIB inputs do not depend on browser timezone', async ({ browser }) => {
  const context = await browser.newContext({ timezoneId: 'America/New_York' })
  const page = await context.newPage()
  try {
    const state = await mockAnnouncements(page, { role: 'ketua_rt' })
    await page.goto('/admin/pengumuman/tambah')
    const form = await fillForm(page)
    await form
      .getByRole('button', { name: 'Simpan Pengumuman', exact: true })
      .click()
    await expect(detailDialog(page)).toBeVisible()
    expect(
      state.requests.find((r) => r.path.endsWith('/create_announcement'))?.body
        .p_starts_at,
    ).toBe('2099-11-05T00:30:00.000Z')
    await expect(detailDialog(page)).toContainText('07.30')
  } finally {
    await context.close()
  }
})

for (const width of [375, 1280]) {
  test(`announcements are usable at ${width}px with keyboard and responsive layout`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 })
    await mockAnnouncements(page, { role: 'ketua_rt' })
    await page.goto('/admin/pengumuman')
    await expect(page.getByRole('table')).toBeVisible()
    await page.screenshot({
      path: `test-results/announcements-admin-${width}.png`,
      fullPage: true,
    })
    await page
      .getByLabel('Status pengumuman', { exact: true })
      .selectOption('archived')
    await expect(page.getByRole('rowheader')).toHaveCount(1)
    await page
      .getByRole('link', { name: 'Buat Pengumuman', exact: true })
      .click()
    const form = await fillForm(page)
    await expect(form.getByLabel('Deskripsi', { exact: true })).toBeVisible()
    await page.screenshot({
      path: `test-results/announcements-form-${width}.png`,
      fullPage: true,
    })
    await page.keyboard.press('Escape')
    await expect(form).toHaveCount(0)
    await expect(
      page.getByRole('link', { name: 'Buat Pengumuman', exact: true }),
    ).toBeFocused()
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true)
    await page.goto('/warga/pengumuman')
    await expect(page.locator('article')).toHaveCount(4)
    await page.screenshot({
      path: `test-results/announcements-reader-${width}.png`,
      fullPage: true,
    })
  })
}
