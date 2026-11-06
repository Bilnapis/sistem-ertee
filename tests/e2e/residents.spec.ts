import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import type {
  ResidentEvent,
  ResidentProfile,
  ResidentRole,
} from '../../src/lib/database.types'

const uid = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const makeProfile = (n: number): ResidentProfile => ({
  id: uid(n),
  email: `dummy${n}@example.test`,
  full_name: `Warga Dummy ${String(n).padStart(2, '0')}`,
  nik: String(n).padStart(16, '0'),
  family_card_number: '0000000000000099',
  gender: n % 2 ? 'laki_laki' : 'perempuan',
  marital_status: 'menikah',
  phone: '081234567890',
  address: `Jalan Dummy Nomor ${n}`,
  role: n === 1 ? 'ketua_rt' : n === 2 ? 'pengurus_rt' : 'warga',
  is_active: true,
  verification_status: 'menunggu_verifikasi',
  reviewed_by: null,
  reviewed_at: null,
  review_note: null,
  archived_at: null,
  created_by: null,
  created_at: new Date(Date.UTC(2026, 10, 2, 0, n)).toISOString(),
  updated_at: '2026-11-02T00:00:00.000Z',
})
type Options = {
  role?: ResidentRole
  createFailure?: boolean
  loseCreateResponse?: boolean
  updateFailure?: boolean
  passwordFailure?: boolean
  directoryFailure?: boolean
}
async function mockResidents(page: Page, options: Options = {}) {
  const currentId =
    options.role === 'warga'
      ? uid(3)
      : options.role === 'pengurus_rt'
        ? uid(2)
        : uid(1)
  const profiles = new Map(
    Array.from({ length: 14 }, (_, i) => {
      const profile = makeProfile(i + 1)
      return [profile.id, profile]
    }),
  )
  const history: ResidentEvent[] = []
  const requests: { path: string; body: Record<string, unknown> }[] = []
  let revision = 0
  const now = () =>
    new Date(Date.UTC(2026, 10, 3, 1, 0, 0, ++revision)).toISOString()
  const user = {
    id: currentId,
    aud: 'authenticated',
    role: 'authenticated',
    email: profiles.get(currentId)!.email,
    email_confirmed_at: '2026-11-02T00:00:00Z',
    created_at: '2026-11-02T00:00:00Z',
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: {},
    identities: [],
  }
  const token = () =>
    `${Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')}.${Buffer.from(JSON.stringify({ sub: currentId, role: 'authenticated', session_id: currentId.replace('8000', '9000'), exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.dummy-signature`
  const session = () => ({
    access_token: token(),
    refresh_token: 'dummy-refresh',
    token_type: 'bearer',
    expires_in: 3600,
    user,
  })
  await page.route('http://127.0.0.1:54321/**', async (route) => {
    const request = route.request(),
      url = new URL(request.url()),
      path = url.pathname
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
    if (path.endsWith('/token')) return respond(session())
    if (path.endsWith('/user')) return respond(user)
    if (path.endsWith('/logout')) return route.fulfill({ status: 204, headers })
    const current = profiles.get(currentId)!
    const manager =
      current.is_active && !current.archived_at && current.role !== 'warga'
    if (path.endsWith('/announcements_overview'))
      return route.fulfill({
        headers,
        json: {
          items: [],
          total: 0,
          server_now: new Date().toISOString(),
          next_change_at: null,
        },
      })
    if (path.endsWith('/profiles')) {
      const id = url.searchParams.get('id')?.replace(/^eq\./, '')
      const profile = profiles.get(id ?? '')
      return respond(
        profile &&
          (manager ||
            (id === currentId && current.is_active && !current.archived_at))
          ? [profile]
          : [],
      )
    }
    if (path.endsWith('/resident_events')) {
      const id = url.searchParams.get('profile_id')?.replace(/^eq\./, '')
      return respond(
        manager || id === currentId
          ? history.filter((event) => event.profile_id === id).toReversed()
          : [],
      )
    }
    if (
      path.includes('/rpc/') &&
      !manager &&
      !path.endsWith('/update_resident')
    )
      return respond({ code: '42501', message: 'ACCESS_DENIED' }, 403)
    if (path.endsWith('/list_residents')) {
      if (options.directoryFailure) return respond({ code: 'unavailable' }, 503)
      const search = String(body.p_search ?? '').toLowerCase()
      const rows = [...profiles.values()].filter(
        (profile) =>
          (body.p_status === 'archived'
            ? Boolean(profile.archived_at)
            : !profile.archived_at) &&
          (body.p_status !== 'active' || profile.is_active) &&
          (body.p_status !== 'inactive' || !profile.is_active) &&
          (body.p_role === 'all' || body.p_role === profile.role) &&
          (body.p_verification === 'all' ||
            body.p_verification === profile.verification_status) &&
          [profile.full_name, profile.nik].some((value) =>
            value.toLowerCase().includes(search),
          ),
      )
      rows.sort((a, b) =>
        body.p_sort === 'name'
          ? a.full_name.localeCompare(b.full_name)
          : b.created_at.localeCompare(a.created_at),
      )
      const offset = (Number(body.p_page) - 1) * 10
      return respond({
        items: rows.slice(offset, offset + 10),
        total: rows.length,
      })
    }
    if (path.endsWith('/resident_summary')) {
      const rows = [...profiles.values()].filter(
        (profile) => !profile.archived_at,
      )
      return respond({
        total: rows.length,
        menunggu_verifikasi: rows.filter(
          (p) => p.verification_status === 'menunggu_verifikasi',
        ).length,
        terverifikasi: rows.filter(
          (p) => p.verification_status === 'terverifikasi',
        ).length,
        perlu_perbaikan: rows.filter(
          (p) => p.verification_status === 'perlu_perbaikan',
        ).length,
      })
    }
    if (path.endsWith('/update-resident-password')) {
      if (!manager) return respond({ code: 'ACCESS_DENIED' }, 403)
      if (options.passwordFailure)
        return respond({ code: 'PASSWORD_UPDATE_FAILED' }, 503)
      const profile = profiles.get(String(body.id))
      if (!profile) return respond({ code: 'NOT_FOUND' }, 404)
      if (profile.archived_at)
        return respond({ code: 'RESIDENT_ARCHIVED' }, 409)
      return respond({ id: profile.id })
    }
    if (path.endsWith('/create-resident')) {
      if (!manager) return respond({ code: 'ACCESS_DENIED' }, 403)
      if (options.createFailure) return respond({ code: 'CREATE_FAILED' }, 503)
      const id = String(body.request_id)
      if (!profiles.has(id)) {
        profiles.set(id, {
          ...makeProfile(50),
          ...body,
          id,
          created_at: now(),
          updated_at: now(),
        } as ResidentProfile)
      }
      if (options.loseCreateResponse) {
        options.loseCreateResponse = false
        return respond({ code: 'SERVICE_UNAVAILABLE' }, 503)
      }
      return respond({ id }, 201)
    }
    if (
      path.endsWith('/update_resident') ||
      path.endsWith('/review_resident') ||
      path.endsWith('/set_resident_archive')
    ) {
      const profile = profiles.get(String(body.p_id))
      if (!profile) return respond({ code: 'P0002', message: 'NOT_FOUND' }, 404)
      if (body.p_expected_updated_at !== profile.updated_at)
        return respond({ code: '40001', message: 'STALE_PROFILE' }, 409)
      if (options.updateFailure) return respond({ code: 'unavailable' }, 503)
      let action = 'profile_updated'
      if (path.endsWith('/update_resident')) {
        if (
          !manager &&
          (profile.id !== currentId ||
            Object.hasOwn(body.p_data as object, 'role'))
        )
          return respond({ code: '42501', message: 'ACCESS_DENIED' }, 403)
        Object.assign(profile, body.p_data, {
          verification_status: 'menunggu_verifikasi',
          review_note: null,
          reviewed_at: null,
          reviewed_by: null,
        })
      } else if (path.endsWith('/review_resident')) {
        if (body.p_status === 'perlu_perbaikan' && !String(body.p_note).trim())
          return respond(
            { code: '22023', message: 'REVIEW_NOTE_REQUIRED' },
            400,
          )
        Object.assign(profile, {
          verification_status: body.p_status,
          review_note: body.p_note,
          reviewed_by: currentId,
          reviewed_at: now(),
        })
        action = 'reviewed'
      } else {
        Object.assign(profile, {
          archived_at: body.p_archived ? now() : null,
          is_active: false,
        })
        action = body.p_archived ? 'archived' : 'restored'
      }
      profile.updated_at = now()
      history.push({
        id: history.length + 1,
        profile_id: profile.id,
        actor_id: currentId,
        actor_name: current.full_name,
        action,
        details:
          action === 'reviewed'
            ? { status: profile.verification_status, note: profile.review_note }
            : {},
        occurred_at: now(),
      })
      return respond(path.endsWith('/update_resident') ? profile : [profile])
    }
    return respond({}, 404)
  })
  return { profiles, requests, currentId }
}
async function login(page: Page, role: ResidentRole = 'ketua_rt') {
  await page.goto('/login')
  await page
    .getByLabel('Email', { exact: true })
    .fill(
      `dummy${role === 'warga' ? 3 : role === 'pengurus_rt' ? 2 : 1}@example.test`,
    )
  await page.getByLabel('Password', { exact: true }).fill('DummyPassword123!')
  await page.getByRole('button', { name: 'Masuk', exact: true }).click()
  await expect(page).toHaveURL(/\/warga$/)
}
async function openDirectory(page: Page) {
  await page.getByRole('link', { name: 'Warga', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'Data Warga', exact: true }),
  ).toBeVisible()
  await expect(page.getByRole('table')).toBeVisible()
}
async function fillNewResident(page: Page) {
  const dialog = page.getByRole('dialog')
  await dialog
    .getByLabel('Nama Lengkap *', { exact: true })
    .fill('Warga Baru Dummy')
  await dialog.getByLabel('NIK *', { exact: true }).fill('0000000000000050')
  await dialog
    .getByLabel('Nomor Kartu Keluarga *', { exact: true })
    .fill('0000000000000099')
  await dialog
    .getByLabel('Jenis Kelamin *', { exact: true })
    .selectOption('perempuan')
  await dialog
    .getByLabel('Status Pernikahan *', { exact: true })
    .selectOption('belum_menikah')
  await expect(dialog.getByLabel(/Blok Rumah/i)).toHaveCount(0)
  await expect(dialog.getByLabel(/^(Nomor Rumah|RT|RW)$/)).toHaveCount(0)
  await dialog.getByLabel('Nomor HP *', { exact: true }).fill('0812-3456-7890')
  await dialog
    .getByLabel('Alamat Lengkap *', { exact: true })
    .fill('Jalan Dummy Nomor 50')
  await dialog
    .getByLabel('Email *', { exact: true })
    .fill('newdummy@example.test')
  await dialog
    .getByLabel('Password *', { exact: true })
    .fill('DummyPassword123!')
  await dialog
    .getByLabel('Konfirmasi Password *', { exact: true })
    .fill('DummyPassword123!')
}

for (const role of ['ketua_rt', 'pengurus_rt'] as const)
  test(`${role} can create, review, and edit accounts and roles`, async ({
    page,
  }) => {
    const state = await mockResidents(page, { role })
    await login(page, role)
    await openDirectory(page)
    await page.getByRole('link', { name: 'Tambah warga', exact: true }).click()
    await fillNewResident(page)
    await page.getByLabel('Role *', { exact: true }).selectOption('pengurus_rt')
    await page
      .getByRole('button', { name: 'Simpan Warga', exact: true })
      .click()
    const dialog = page.getByRole('dialog', {
      name: 'Detail Warga',
      exact: true,
    })
    await expect(
      dialog.getByText('Warga Baru Dummy', { exact: true }),
    ).toBeVisible()
    await expect(dialog.getByText('Pengurus RT', { exact: true })).toBeVisible()
    await expect(
      dialog.getByText('0000••••••••0050', { exact: true }),
    ).toBeVisible()
    await dialog.getByRole('button', { name: 'Verifikasi data' }).click()
    await expect(
      dialog.getByText('Terverifikasi', { exact: true }).first(),
    ).toBeVisible()
    await dialog.getByRole('link', { name: 'Edit Data', exact: true }).click()
    const editor = page.getByRole('dialog', {
      name: 'Edit Data Warga',
      exact: true,
    })
    await expect(editor.getByLabel(/^(Nomor Rumah|RT|RW)$/)).toHaveCount(0)
    await expect(editor.getByLabel(/Blok Rumah/i)).toHaveCount(0)
    await editor
      .getByLabel('Alamat Lengkap *', { exact: true })
      .fill('Alamat Dummy Diperbarui')
    await editor.getByLabel('Role *', { exact: true }).selectOption('ketua_rt')
    await editor
      .getByLabel('Status Warga *', { exact: true })
      .selectOption('false')
    await editor.getByRole('button', { name: 'Simpan Perubahan' }).click()
    await expect(
      editor.getByText('Nonaktifkan akun Warga Baru Dummy?'),
    ).toBeVisible()
    await editor.getByRole('button', { name: 'Konfirmasi & simpan' }).click()
    await expect(
      dialog.getByText('Alamat Dummy Diperbarui', { exact: true }),
    ).toBeVisible()
    await expect(dialog.getByText('Ketua RT', { exact: true })).toBeVisible()
    await expect(dialog.getByText('Tidak Aktif', { exact: true })).toBeVisible()
    const creation = state.requests.find((request) =>
      request.path.endsWith('/create-resident'),
    )!.body
    expect(creation.phone).toBe('081234567890')
    expect(creation).not.toHaveProperty('house_number')
    expect(creation).not.toHaveProperty('house_block')
    expect(creation).not.toHaveProperty('rt')
    expect(creation).not.toHaveProperty('rw')
    expect(creation).not.toHaveProperty('confirmation')
  })

test('search, role/status filters, ordering, pagination, and empty states use the server', async ({
  page,
}) => {
  const state = await mockResidents(page)
  await login(page)
  await openDirectory(page)
  await expect(page.getByText('Menampilkan 1–10 dari 14 warga')).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Halaman sebelumnya' }),
  ).toBeDisabled()
  await page.getByRole('button', { name: 'Halaman berikutnya' }).click()
  await expect(page.getByText('Menampilkan 11–14 dari 14 warga')).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Halaman berikutnya' }),
  ).toBeDisabled()
  await expect(
    page.getByRole('navigation', { name: 'Halaman warga' }),
  ).toContainText('2 / 2')
  await page.getByLabel('Role warga', { exact: true }).selectOption('ketua_rt')
  await expect(page.getByText('Menampilkan 1–1 dari 1 warga')).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Halaman sebelumnya' }),
  ).toBeDisabled()
  await page.getByLabel('Role warga', { exact: true }).selectOption('all')
  await page.getByLabel('Urutkan warga', { exact: true }).selectOption('name')
  await expect(page.getByRole('row').nth(1)).toContainText('Warga Dummy 01')
  await page.getByLabel('Cari warga', { exact: true }).fill('0000000000000003')
  await expect(page.getByRole('row').nth(1)).toContainText('Warga Dummy 03')
  await page.getByLabel('Cari warga', { exact: true }).fill('tidak ditemukan')
  await expect(
    page.getByRole('heading', { name: 'Belum ada warga yang ditampilkan' }),
  ).toBeVisible()
  await expect(page.getByText('Menampilkan 0–0 dari 0 warga')).toBeVisible()
  await page.getByLabel('Cari warga', { exact: true }).fill('')
  await page.getByLabel('Status akun', { exact: true }).selectOption('inactive')
  await expect(
    page.getByRole('heading', { name: 'Belum ada warga yang ditampilkan' }),
  ).toBeVisible()
  expect(state.requests.some((request) => request.body.p_page === 2)).toBe(true)
  expect(state.requests.some((request) => request.body.p_sort === 'name')).toBe(
    true,
  )
  await page.goto('/admin/warga?verification=perlu_perbaikan')
  await expect(page.getByText('Menampilkan 1–10 dari 14 warga')).toBeVisible()
})

test('correction reasons, archive/restore, and verification summaries reflect persisted changes', async ({
  page,
}) => {
  await mockResidents(page)
  await login(page)
  await openDirectory(page)
  await page.getByLabel('Cari warga').fill('Warga Dummy 03')
  await page
    .getByRole('link', { name: 'Lihat Warga Dummy 03', exact: true })
    .click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'Minta perbaikan' }).click()
  await dialog.getByRole('button', { name: 'Konfirmasi tindakan' }).click()
  await expect(dialog.getByText('Isi alasan perbaikan data.')).toBeVisible()
  await dialog.getByLabel('Alasan perbaikan *').fill('Lengkapi alamat dummy.')
  await dialog.getByRole('button', { name: 'Konfirmasi tindakan' }).click()
  await expect(dialog.getByText('Catatan pengurus:')).toBeVisible()
  await expect(
    dialog.getByText('Lengkapi alamat dummy.', { exact: true }).first(),
  ).toBeVisible()
  await dialog.getByRole('button', { name: 'Arsipkan warga' }).click()
  await dialog.getByRole('button', { name: 'Konfirmasi tindakan' }).click()
  await expect(dialog.getByText('Diarsipkan', { exact: true })).toBeVisible()
  await dialog.getByRole('button', { name: 'Pulihkan arsip' }).click()
  await dialog.getByRole('button', { name: 'Konfirmasi tindakan' }).click()
  await expect(dialog.getByText('Tidak Aktif', { exact: true })).toBeVisible()
  await expect(
    dialog.getByRole('heading', { name: 'Riwayat perubahan' }),
  ).toBeVisible()
  await dialog.getByRole('button', { name: 'Tutup', exact: true }).click()
  const summary = page.getByRole('region', { name: 'Ringkasan pendataan' })
  await expect(summary.getByRole('button')).toHaveCount(0)
  await expect(
    summary
      .locator('div')
      .filter({ has: page.getByText('Perlu Perbaikan', { exact: true }) })
      .locator('dd'),
  ).toHaveText('1')
  const currentUrl = page.url()
  await summary.getByText('Perlu Perbaikan', { exact: true }).click()
  await expect(page).toHaveURL(currentUrl)
  await expect(page.getByText('Menampilkan 1–1 dari 1 warga')).toBeVisible()
})

test('warga can update only their own profile and cannot open management routes', async ({
  page,
}) => {
  const state = await mockResidents(page, { role: 'warga' })
  state.profiles.get(uid(3))!.verification_status = 'terverifikasi'
  await login(page, 'warga')
  for (const path of [
    '/admin/warga',
    `/admin/warga/${uid(4)}/edit`,
    '/admin/warga/tambah',
  ]) {
    await page.goto(path)
    await expect(
      page.getByRole('heading', { name: 'Akses ditolak' }),
    ).toBeVisible()
    await expect(page.getByRole('table')).toHaveCount(0)
  }
  await page.goto('/warga/profil')
  await expect(page.getByText(/^Nomor rumah$/i)).toHaveCount(0)
  await page.getByRole('button', { name: 'Edit profil sendiri' }).click()
  const dialog = page.getByRole('dialog', { name: 'Edit Profil Saya' })
  await expect(dialog.getByLabel('Role *', { exact: true })).toHaveCount(0)
  await expect(dialog.getByLabel('Password Baru', { exact: true })).toHaveCount(
    0,
  )
  await expect(dialog.getByLabel(/^(Nomor Rumah|RT|RW)$/)).toHaveCount(0)
  await dialog
    .getByLabel('Alamat Lengkap *', { exact: true })
    .fill('Alamat Dummy Milik Sendiri')
  await dialog.getByRole('button', { name: 'Simpan Perubahan' }).click()
  await expect(dialog).not.toBeVisible()
  await expect(
    page.getByText('Alamat Dummy Milik Sendiri', { exact: true }),
  ).toBeVisible()
  const change = state.requests.find((request) =>
    request.path.endsWith('/update_resident'),
  )!
  expect(change.body.p_id).toBe(uid(3))
  expect(change.body.p_data).not.toHaveProperty('role')
  expect(change.body.p_data).not.toHaveProperty('house_number')
  expect(state.profiles.get(uid(3))!).not.toHaveProperty('house_number')
  expect(state.profiles.get(uid(3))!.verification_status).toBe(
    'menunggu_verifikasi',
  )
})

for (const role of ['warga', 'ketua_rt', 'pengurus_rt'] as const)
  test(`${role} can edit their own data from the header account menu`, async ({
    page,
  }) => {
    await page.setViewportSize({
      width: role === 'warga' ? 320 : 1440,
      height: 900,
    })
    const state = await mockResidents(page, { role })
    await login(page, role)
    await page.goto('/warga/iuran-warga')
    const name = state.profiles.get(state.currentId)!.full_name
    const trigger = page.getByRole('button', {
      name: `Menu akun ${name},`,
      exact: false,
    })
    const actions = page.getByRole('group', {
      name: 'Tindakan akun',
      exact: true,
    })
    await trigger.click()
    await actions
      .getByRole('button', { name: 'Ubah data diri', exact: true })
      .click()
    const dialog = page.getByRole('dialog', {
      name: 'Edit Profil Saya',
      exact: true,
    })
    await expect(dialog).toBeVisible()
    await expect(actions).not.toBeVisible()
    await expect(
      dialog.getByLabel('Nama Lengkap *', { exact: true }),
    ).toHaveValue(name)
    await expect(dialog.getByLabel('Role *', { exact: true })).toHaveCount(0)
    await expect(
      dialog.getByLabel('Password Baru', { exact: true }),
    ).toHaveCount(0)
    await dialog.getByRole('button', { name: 'Batal', exact: true }).click()
    await expect(trigger).toBeFocused()
    await trigger.click()
    await actions
      .getByRole('button', { name: 'Ubah data diri', exact: true })
      .click()
    await dialog
      .getByLabel('Nama Lengkap *', { exact: true })
      .fill('Nama Akun Diperbarui')
    await dialog
      .getByRole('button', { name: 'Simpan Perubahan', exact: true })
      .click()
    await expect(dialog).not.toBeVisible()
    await expect(
      page.getByRole('button', {
        name: 'Menu akun Nama Akun Diperbarui,',
        exact: false,
      }),
    ).toBeVisible()
    await expect(page).toHaveURL(/\/warga\/iuran-warga$/)
    const change = state.requests.find((request) =>
      request.path.endsWith('/update_resident'),
    )!
    expect(change.body.p_id).toBe(state.currentId)
    expect(change.body.p_data).not.toHaveProperty('role')
    expect(change.body.p_data).not.toHaveProperty('is_active')
  })

test('creation validation and failures preserve input; a lost response retries without a second account', async ({
  page,
}) => {
  const options: Options = { loseCreateResponse: true }
  const state = await mockResidents(page, options)
  await login(page)
  await openDirectory(page)
  await page.getByRole('link', { name: 'Tambah warga', exact: true }).click()
  await page.getByRole('button', { name: 'Simpan Warga' }).click()
  await expect(page.getByLabel('Nama Lengkap *', { exact: true })).toBeFocused()
  await fillNewResident(page)
  await page.getByRole('button', { name: 'Simpan Warga' }).click()
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText(
    'Permintaan belum berhasil',
  )
  await expect(page.getByLabel('Nama Lengkap *', { exact: true })).toHaveValue(
    'Warga Baru Dummy',
  )
  await page.getByRole('button', { name: 'Simpan Warga' }).click()
  await expect(page.getByRole('dialog', { name: 'Detail Warga' })).toBeVisible()
  const requests = state.requests.filter((request) =>
    request.path.endsWith('/create-resident'),
  )
  expect(requests).toHaveLength(2)
  expect(requests[0].body.request_id).toBe(requests[1].body.request_id)
  expect(
    [...state.profiles.values()].filter(
      (profile) => profile.full_name === 'Warga Baru Dummy',
    ),
  ).toHaveLength(1)
})

test('directory and update failures can be retried without losing edits', async ({
  page,
}) => {
  const options: Options = { directoryFailure: true }
  await mockResidents(page, options)
  await login(page)
  await page.getByRole('link', { name: 'Warga', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText(
    'Permintaan belum berhasil',
  )
  options.directoryFailure = false
  await page.getByRole('button', { name: 'Coba lagi', exact: true }).click()
  await expect(page.getByRole('table')).toBeVisible()
  await page.getByRole('link', { name: 'Lihat Warga Dummy 14' }).click()
  await page.getByRole('link', { name: 'Edit Data', exact: true }).click()
  await page
    .getByLabel('Alamat Lengkap *', { exact: true })
    .fill('Alamat Dummy Retry')
  options.updateFailure = true
  await page.getByRole('button', { name: 'Simpan Perubahan' }).click()
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText(
    'Permintaan belum berhasil',
  )
  await expect(
    page.getByLabel('Alamat Lengkap *', { exact: true }),
  ).toHaveValue('Alamat Dummy Retry')
  options.updateFailure = false
  await page.getByRole('button', { name: 'Simpan Perubahan' }).click()
  await expect(
    page.getByRole('dialog').getByText('Alamat Dummy Retry', { exact: true }),
  ).toBeVisible()
})

test('responsive directory and dialogs support keyboard, Escape, focus return, and no page overflow', async ({
  page,
}) => {
  await mockResidents(page)
  await login(page)
  await openDirectory(page)
  for (const width of [320, 375, 768, 1280, 1648]) {
    await page.setViewportSize({ width, height: 1056 })
    await expect(page.getByRole('table')).toBeVisible()
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width)
    await page.screenshot({
      path: `test-results/residents-directory-${width}.png`,
      fullPage: true,
    })
    const trigger = page.getByRole('link', {
      name: 'Tambah warga',
      exact: true,
    })
    await trigger.click()
    const dialog = page.getByRole('dialog', { name: 'Tambah Warga Baru' })
    await expect(dialog).toBeVisible()
    const box = await dialog.boundingBox()
    expect(box!.width).toBeLessThanOrEqual(width)
    await page.keyboard.press('Tab')
    expect(
      await page.evaluate(() =>
        Boolean(document.activeElement?.closest('dialog')),
      ),
    ).toBe(true)
    await page.screenshot({
      path: `test-results/residents-create-${width}.png`,
      fullPage: true,
    })
    await page.keyboard.press('Escape')
    await expect(dialog).not.toBeVisible()
    await expect(trigger).toBeFocused()
    await page
      .getByRole('link', { name: 'Lihat Warga Dummy 14', exact: true })
      .click()
    await expect(
      page.getByRole('dialog', { name: 'Detail Warga', exact: true }),
    ).toBeVisible()
    await page.screenshot({
      path: `test-results/residents-detail-${width}.png`,
      fullPage: true,
    })
    await page.getByRole('link', { name: 'Edit Data', exact: true }).click()
    await expect(
      page.getByRole('dialog', { name: 'Edit Data Warga', exact: true }),
    ).toBeVisible()
    await page.screenshot({
      path: `test-results/residents-edit-${width}.png`,
      fullPage: true,
    })
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
  }
})

for (const role of ['ketua_rt', 'pengurus_rt'] as const)
  test(`${role} can update a resident password directly without saving profile edits`, async ({
    page,
  }) => {
    await page.setViewportSize({
      width: role === 'ketua_rt' ? 1280 : 375,
      height: 900,
    })
    const state = await mockResidents(page, { role })
    const original = { ...state.profiles.get(uid(14))! }
    await login(page, role)
    await page.goto(`/admin/warga/${uid(14)}/edit`)
    const dialog = page.getByRole('dialog', {
      name: 'Edit Data Warga',
      exact: true,
    })
    await dialog
      .getByLabel('Nama Lengkap *', { exact: true })
      .fill('Perubahan Biodata Belum Disimpan')
    const password = dialog.getByLabel('Password Baru', { exact: true })
    const confirmation = dialog.getByLabel('Konfirmasi Password Baru', {
      exact: true,
    })
    await expect(password).toHaveAttribute('type', 'password')
    await password.fill('NewDummyPassword123!')
    await confirmation.fill('NewDummyPassword123!')
    await dialog
      .getByRole('button', { name: 'Tampilkan password baru', exact: true })
      .click()
    await expect(password).toHaveAttribute('type', 'text')
    await expect(confirmation).toHaveAttribute('type', 'text')
    await dialog
      .getByRole('button', { name: 'Sembunyikan password baru', exact: true })
      .click()
    await dialog
      .getByRole('button', { name: 'Perbarui Password', exact: true })
      .scrollIntoViewIfNeeded()
    await page.screenshot({
      path: `test-results/resident-password-${role}.png`,
      fullPage: true,
    })
    // Enter submits the password form rather than the biodata form.
    await confirmation.press('Enter')
    await expect(dialog.getByRole('status')).toHaveText(
      'Password akun warga berhasil diperbarui.',
    )
    await expect(password).toHaveValue('')
    await expect(confirmation).toHaveValue('')
    await expect(password).toHaveAttribute('type', 'password')
    const requests = state.requests.filter((request) =>
      request.path.endsWith('/update-resident-password'),
    )
    expect(requests).toHaveLength(1)
    expect(requests[0].body).toEqual({
      id: uid(14),
      password: 'NewDummyPassword123!',
    })
    expect(
      state.requests.filter((request) =>
        request.path.endsWith('/update_resident'),
      ),
    ).toHaveLength(0)
    expect(state.profiles.get(uid(14))).toEqual(original)
    await expect(
      dialog.getByLabel('Nama Lengkap *', { exact: true }),
    ).toHaveValue('Perubahan Biodata Belum Disimpan')
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(role === 'ketua_rt' ? 1280 : 375)
    await dialog
      .getByRole('button', { name: 'Simpan Perubahan', exact: true })
      .click()
    await expect(
      page.getByRole('dialog', { name: 'Detail Warga', exact: true }),
    ).toBeVisible()
    const update = state.requests.find((request) =>
      request.path.endsWith('/update_resident'),
    )!
    expect(update.body.p_data).not.toHaveProperty('password')
    expect(
      state.requests.filter((request) =>
        request.path.endsWith('/update-resident-password'),
      ),
    ).toHaveLength(1)
  })

test('password validation and server failures keep the editor available for correction and retry', async ({
  page,
}) => {
  const options: Options = { passwordFailure: true }
  const state = await mockResidents(page, options)
  await login(page)
  await page.goto(`/admin/warga/${uid(14)}/edit`)
  const dialog = page.getByRole('dialog', {
    name: 'Edit Data Warga',
    exact: true,
  })
  const password = dialog.getByLabel('Password Baru', { exact: true })
  const confirmation = dialog.getByLabel('Konfirmasi Password Baru', {
    exact: true,
  })
  const submit = dialog.getByRole('button', {
    name: 'Perbarui Password',
    exact: true,
  })
  await submit.click()
  await expect(password).toBeFocused()
  await expect(
    dialog.getByText('Password harus berisi 8–128 karakter.'),
  ).toBeVisible()
  await password.fill('NewDummyPassword123!')
  await confirmation.fill('DifferentPassword123!')
  await submit.click()
  await expect(confirmation).toBeFocused()
  await expect(
    dialog.getByText('Konfirmasi password harus sama.'),
  ).toBeVisible()
  expect(
    state.requests.filter((request) =>
      request.path.endsWith('/update-resident-password'),
    ),
  ).toHaveLength(0)
  await confirmation.fill('NewDummyPassword123!')
  await submit.click()
  await expect(dialog.getByRole('alert')).toContainText(
    'Password belum berhasil diperbarui.',
  )
  await expect(password).toHaveValue('NewDummyPassword123!')
  await expect(confirmation).toHaveValue('NewDummyPassword123!')
  await expect(dialog.getByRole('status')).toHaveCount(0)
  options.passwordFailure = false
  await submit.click()
  await expect(dialog.getByRole('status')).toHaveText(
    'Password akun warga berhasil diperbarui.',
  )
  await expect(dialog.getByRole('alert')).toHaveCount(0)
})

test('saving biodata with an untouched password form does not change the password', async ({
  page,
}) => {
  const state = await mockResidents(page)
  await login(page)
  await page.goto(`/admin/warga/${uid(14)}/edit`)
  const dialog = page.getByRole('dialog', {
    name: 'Edit Data Warga',
    exact: true,
  })
  await dialog
    .getByLabel('Nama Lengkap *', { exact: true })
    .fill('Biodata Tanpa Password')
  await dialog
    .getByRole('button', { name: 'Simpan Perubahan', exact: true })
    .click()
  await expect(
    page.getByRole('dialog', { name: 'Detail Warga', exact: true }),
  ).toBeVisible()
  expect(
    state.requests.filter((request) =>
      request.path.endsWith('/update-resident-password'),
    ),
  ).toHaveLength(0)
})

test('password requests disable conflicting controls and prevent repeated submissions', async ({
  page,
}) => {
  const state = await mockResidents(page)
  let release: () => void = () => {}
  const pending = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route(
    '**/functions/v1/update-resident-password',
    async (route) => {
      await pending
      await route.fallback()
    },
  )
  await login(page)
  await page.goto(`/admin/warga/${uid(14)}/edit`)
  const dialog = page.getByRole('dialog', {
    name: 'Edit Data Warga',
    exact: true,
  })
  await dialog
    .getByLabel('Password Baru', { exact: true })
    .fill('NewDummyPassword123!')
  await dialog
    .getByLabel('Konfirmasi Password Baru', { exact: true })
    .fill('NewDummyPassword123!')
  try {
    await dialog
      .getByRole('button', { name: 'Perbarui Password', exact: true })
      .click()
    await expect(
      dialog.getByRole('button', {
        name: 'Memperbarui Password…',
        exact: true,
      }),
    ).toBeDisabled()
    await expect(
      dialog.getByRole('button', { name: 'Simpan Perubahan', exact: true }),
    ).toBeDisabled()
    await expect(
      dialog.getByRole('button', { name: 'Batal', exact: true }),
    ).toBeDisabled()
    await expect(
      dialog.getByRole('button', { name: 'Tutup dialog', exact: true }),
    ).toBeDisabled()
    await expect(
      dialog.getByLabel('Nama Lengkap *', { exact: true }),
    ).toBeDisabled()
    await page.keyboard.press('Escape')
    await expect(dialog).toBeVisible()
  } finally {
    release()
  }
  await expect(dialog.getByRole('status')).toHaveText(
    'Password akun warga berhasil diperbarui.',
  )
  expect(
    state.requests.filter((request) =>
      request.path.endsWith('/update-resident-password'),
    ),
  ).toHaveLength(1)
})

test('logout clears directory data before another user logs in', async ({
  page,
}) => {
  await mockResidents(page)
  await login(page)
  await openDirectory(page)
  await expect(page.getByText('Warga Dummy 14', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: /^Menu akun / }).click()
  await page.getByRole('button', { name: 'Keluar', exact: true }).click()
  await expect(page).toHaveURL(/\/login$/)
  await mockResidents(page, { role: 'warga' })
  await login(page, 'warga')
  await page.goto('/admin/warga')
  await expect(
    page.getByRole('heading', { name: 'Akses ditolak' }),
  ).toBeVisible()
  await expect(page.getByText('Warga Dummy 14', { exact: true })).toHaveCount(0)
})
