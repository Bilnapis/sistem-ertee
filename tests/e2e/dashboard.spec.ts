import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

async function mockDashboard(page: Page, role = 'ketua_rt') {
  const id = '00000000-0000-4000-8000-000000000001'
  const user = {
    id,
    aud: 'authenticated',
    role: 'authenticated',
    email: 'admin@example.test',
    created_at: '2026-11-01T00:00:00Z',
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: {},
  }
  const profile = {
    ...user,
    full_name: 'Pengurus RT',
    role,
    is_active: true,
    verification_status: 'terverifikasi',
  }
  const token = `${Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')}.${Buffer.from(JSON.stringify({ sub: id, role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.test`
  const session = {
    access_token: token,
    refresh_token: 'test-refresh',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user,
  }
  await page.addInitScript(
    (value) => localStorage.setItem('sb-127-auth-token', JSON.stringify(value)),
    session,
  )
  const state = {
    failure: false,
    empty: false,
    requests: [] as { path: string; body: Record<string, unknown> }[],
  }
  await page.route('http://127.0.0.1:54321/**', async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    const headers = {
      'access-control-allow-origin': '*',
      'content-type': 'application/json',
      'x-supabase-api-version': '2024-01-01',
    }
    const respond = (json: unknown, status = 200) =>
      route.fulfill({ json, status, headers })
    if (request.method() === 'OPTIONS') return respond({})
    const body = request.postData() ? request.postDataJSON() : {}
    state.requests.push({ path, body })
    if (path.endsWith('/user')) return respond(user)
    if (path.endsWith('/profiles')) return respond([profile])
    if (path.endsWith('/dues_overview')) {
      if (state.failure) return respond({ code: 'unavailable' }, 503)
      return respond({
        period: '2026-11-01',
        summary: { income: state.empty ? 0 : 1250000 },
      })
    }
    if (
      path.endsWith('/complaints_overview') ||
      path.endsWith('/list_letter_requests')
    ) {
      if (state.failure) return respond({ code: 'unavailable' }, 503)
      const complaint = path.endsWith('/complaints_overview')
      const items = Array.from({ length: 4 }, (_, index) => {
        const number = (Number(body.p_page) - 1) * 4 + index + 1
        return {
          id: `${id.slice(0, -2)}${String(number).padStart(2, '0')}`,
          reference: `${complaint ? 'ADU' : 'SUR'}-${number}`,
          identity_snapshot: { full_name: `Warga ${number}` },
          title: `Lampu jalan ${number} padam`,
          letter_type_label: 'Surat Pengantar Domisili',
          status: complaint ? 'diajukan' : 'pengajuan',
          created_at: '2026-11-06T02:00:00Z',
        }
      })
      return respond({
        items: state.empty ? [] : items,
        total: state.empty ? 0 : complaint ? 12 : 20,
      })
    }
    return respond([])
  })
  return state
}

for (const role of ['ketua_rt', 'pengurus_rt']) {
  test(`${role} dashboard uses complete totals and independent table pagination`, async ({
    page,
  }) => {
    const state = await mockDashboard(page, role)
    await page.goto('/admin')
    await expect(
      page.getByRole('heading', { name: 'Dashboard', exact: true }),
    ).toBeVisible()
    await expect(
      page.getByRole('link', { name: 'Dashboard', exact: true }),
    ).toHaveAttribute('aria-current', 'page')
    const summary = page.getByRole('region', { name: 'Ringkasan dashboard' })
    await expect(summary.locator('dd')).toContainText([
      'Rp1.250.000',
      '20',
      '12',
    ])
    await expect(summary).toContainText('Penerimaan November 2026')
    const complaints = page.getByRole('region', {
      name: 'Pengaduan warga',
      exact: true,
    })
    const letters = page.getByRole('region', {
      name: 'Pengajuan surat',
      exact: true,
    })
    await complaints.getByRole('button', { name: 'Halaman berikutnya' }).click()
    await expect(complaints).toContainText('Menampilkan 5–8 dari 12 pengaduan')
    await expect(letters).toContainText('Menampilkan 1–4 dari 20 pengajuan')
    await letters.getByRole('button', { name: 'Halaman berikutnya' }).click()
    await expect(letters).toContainText('Menampilkan 5–8 dari 20 pengajuan')
    await expect(summary.locator('dd')).toContainText([
      'Rp1.250.000',
      '20',
      '12',
    ])
    await expect(
      complaints.getByRole('link', {
        name: 'Lihat pengaduan ADU-5',
        exact: true,
      }),
    ).toHaveAttribute('href', /\/admin\/pengaduan\//)
    await expect(
      letters.getByRole('link', { name: 'Lihat pengajuan SUR-5', exact: true }),
    ).toHaveAttribute('href', /\/admin\/pengajuan-surat\//)
    for (const request of state.requests.filter((item) =>
      item.path.includes('/rpc/'),
    ))
      expect(request.body.p_scope).toBe('all')
    await expect(
      page.getByRole('link', { name: 'Lihat semua pengaduan' }),
    ).toHaveAttribute('href', '/admin/pengaduan')
    await expect(
      page.getByRole('link', { name: 'Lihat semua pengajuan surat' }),
    ).toHaveAttribute('href', '/admin/pengajuan-surat')
  })
}

test('dashboard handles unavailable data and recovers to empty totals', async ({
  page,
}) => {
  const state = await mockDashboard(page)
  state.failure = true
  await page.goto('/admin')
  await expect(page.getByRole('alert')).toHaveCount(3)
  await expect(
    page.getByRole('region', { name: 'Ringkasan dashboard' }).locator('dd'),
  ).toContainText(['—', '—', '—'])
  state.failure = false
  state.empty = true
  await page
    .getByRole('button', { name: 'Coba lagi iuran', exact: true })
    .click()
  await page
    .getByRole('region', { name: 'Pengaduan warga', exact: true })
    .getByRole('button', { name: 'Coba lagi', exact: true })
    .click()
  await page
    .getByRole('region', { name: 'Pengajuan surat', exact: true })
    .getByRole('button', { name: 'Coba lagi', exact: true })
    .click()
  await expect(page.getByRole('alert')).toHaveCount(0)
  await expect(
    page.getByRole('region', { name: 'Ringkasan dashboard' }).locator('dd'),
  ).toContainText(['Rp0', '0', '0'])
  await expect(
    page.getByText('Belum ada pengaduan warga.', { exact: true }),
  ).toBeVisible()
  await expect(
    page.getByText('Belum ada pengajuan surat warga.', { exact: true }),
  ).toBeVisible()
})

test('dashboard is responsive and mobile navigation opens it', async ({
  page,
}, testInfo) => {
  await mockDashboard(page)
  for (const width of [375, 768, 1088, 1648]) {
    await page.setViewportSize({ width, height: 1056 })
    await page.goto('/admin')
    await expect(page.getByRole('table')).toHaveCount(2)
    for (const action of await page
      .getByRole('link', { name: /^Lihat (pengaduan|pengajuan) / })
      .all()) {
      expect((await action.boundingBox())?.height).toBeLessThanOrEqual(44)
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true)
    await page.screenshot({
      path: testInfo.outputPath(`dashboard-${width}.png`),
      fullPage: true,
    })
  }
  await page.setViewportSize({ width: 375, height: 812 })
  await page.getByRole('button', { name: 'Buka menu navigasi' }).click()
  const menu = page.getByRole('dialog', { name: 'Menu navigasi', exact: true })
  await menu.getByRole('link', { name: 'Dashboard', exact: true }).click()
  await expect(menu).not.toBeVisible()
  await expect(page).toHaveURL('/admin')
})

test('residents cannot access the admin dashboard', async ({ page }) => {
  await mockDashboard(page, 'warga')
  await page.goto('/admin')
  await expect(
    page.getByRole('heading', { name: 'Akses ditolak', exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('region', { name: 'Ringkasan dashboard' }),
  ).toHaveCount(0)
})
