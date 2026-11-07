import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const id = '00000000-0000-4000-8000-000000000001'
const user = {
  id,
  aud: 'authenticated',
  role: 'authenticated',
  email: 'warga@example.test',
  email_confirmed_at: '2026-11-02T00:00:00Z',
  created_at: '2026-11-02T00:00:00Z',
  app_metadata: { provider: 'email', providers: ['email'] },
  user_metadata: {},
  identities: [],
}
const profile = {
  id,
  email: user.email,
  full_name: 'Warga Uji',
  nik: '0000000000000001',
  family_card_number: '0000000000000099',
  phone: '081234567890',
  address: 'Jalan Dummy Nomor 1',
  role: 'warga',
  is_active: true,
  verification_status: 'menunggu_verifikasi',
  created_at: user.created_at,
  updated_at: user.created_at,
}
const jwt = () =>
  `${Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')}.${Buffer.from(JSON.stringify({ sub: id, role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.testsignature`
const session = () => ({
  access_token: jwt(),
  refresh_token: 'dummy-refresh-token',
  token_type: 'bearer',
  expires_in: 3600,
  user,
})

async function mockSupabase(
  page: Page,
  options: {
    invalidPassword?: boolean
    disabled?: boolean
    confirmationRequired?: boolean
    signupFailure?: boolean
    profileFailure?: boolean
    fullName?: string
    role?: 'ketua_rt' | 'pengurus_rt' | 'warga'
  } = {},
) {
  const calls: { signup?: Record<string, unknown>; logout?: boolean } = {}
  await page.route('http://127.0.0.1:54321/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    const headers = {
      'access-control-allow-origin': '*',
      'access-control-expose-headers': 'x-supabase-api-version, retry-after',
      'content-type': 'application/json',
      'x-supabase-api-version': '2024-01-01',
    }
    if (route.request().method() === 'OPTIONS')
      return route.fulfill({ status: 200, headers })
    if (path.endsWith('/signup')) {
      calls.signup = route.request().postDataJSON()
      if (options.signupFailure)
        return route.fulfill({
          status: 500,
          headers,
          json: {
            code: 'unexpected_failure',
            msg: 'internal database details that must not be displayed',
          },
        })
      return route.fulfill({
        headers,
        json: options.confirmationRequired
          ? { user, session: null }
          : session(),
      })
    }
    if (path.endsWith('/token')) {
      if (options.invalidPassword)
        return route.fulfill({
          status: 400,
          headers,
          json: {
            code: 'invalid_credentials',
            msg: 'Invalid login credentials',
          },
        })
      return route.fulfill({ headers, json: session() })
    }
    if (path.endsWith('/user')) return route.fulfill({ headers, json: user })
    if (path.endsWith('/logout')) {
      calls.logout = true
      return route.fulfill({ status: 204, headers })
    }
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
      if (options.profileFailure)
        return route.fulfill({
          status: 503,
          headers: { ...headers, 'retry-after': '0' },
          json: { message: 'unavailable' },
        })
      return route.fulfill({
        headers,
        json: options.disabled
          ? []
          : [
              {
                ...profile,
                full_name: options.fullName ?? profile.full_name,
                role: options.role ?? profile.role,
              },
            ],
      })
    }
    return route.fulfill({ status: 404, headers, json: {} })
  })
  return calls
}

async function login(page: Page) {
  await page.goto('/login')
  await page.getByLabel('Email', { exact: true }).fill(user.email)
  await page.getByLabel('Password', { exact: true }).fill('PasswordUji123!')
  await page.getByRole('button', { name: 'Masuk', exact: true }).click()
}

for (const role of ['ketua_rt', 'pengurus_rt', 'warga'] as const) {
  test(`${role} lands on its dashboard after login and auth entry routes`, async ({
    page,
  }) => {
    await mockSupabase(page, { role })
    await login(page)
    const dashboard = role === 'warga' ? '/warga' : '/admin'
    await expect(page).toHaveURL(dashboard)
    await expect(
      page.getByRole('heading', { name: 'Dashboard', exact: true }),
    ).toBeVisible()
    await expect(
      page.getByRole('link', { name: 'Dashboard', exact: true }),
    ).toHaveAttribute('aria-current', 'page')

    for (const path of [
      '/login',
      '/register',
      '/auth/callback',
      '/',
      '/unknown',
    ]) {
      await page.goto(path)
      await expect(page).toHaveURL(dashboard)
      await expect(
        page.getByRole('heading', { name: 'Dashboard', exact: true }),
      ).toBeVisible()
    }
  })
}

async function fillRegistration(page: Page) {
  await page.goto('/register')
  await page
    .getByLabel('Nama Lengkap *', { exact: true })
    .fill(profile.full_name)
  await page.getByLabel('Email *', { exact: true }).fill(user.email)
  await page.getByLabel('NIK *', { exact: true }).fill(profile.nik)
  await page
    .getByLabel('Nomor Kartu Keluarga *', { exact: true })
    .fill(profile.family_card_number)
  await page.getByLabel('Nomor HP *', { exact: true }).fill(profile.phone)
  await page.getByLabel('Alamat *', { exact: true }).fill(profile.address)
  await expect(page.getByLabel(/Blok Rumah/i)).toHaveCount(0)
  await page.getByLabel('Password *', { exact: true }).fill('PasswordUji123!')
  await page
    .getByLabel('Konfirmasi Password *', { exact: true })
    .fill('PasswordUji123!')
}

test('direct access without session redirects to login', async ({ page }) => {
  await mockSupabase(page)
  await page.goto('/warga')
  await expect(page).toHaveURL(/\/login$/)
  await expect(
    page.getByRole('complementary', { name: 'Sidebar admin' }),
  ).toHaveCount(0)
  await expect(
    page.getByRole('heading', { name: 'Selamat Datang!' }),
  ).toBeVisible()
})

test('login, reload, logout, browser back, and direct access enforce session boundary', async ({
  page,
}) => {
  const calls = await mockSupabase(page)
  await login(page)
  await expect(page).toHaveURL(/\/warga$/)
  await expect(
    page.getByRole('heading', { name: 'Dashboard', exact: true }),
  ).toBeVisible()
  const sidebar = page.getByRole('complementary', { name: 'Sidebar admin' })
  await expect(sidebar).toBeVisible()
  await expect(sidebar.locator('a[aria-current="page"]')).toHaveText(
    'Dashboard',
  )
  await page.screenshot({
    path: 'test-results/authenticated-home-desktop.png',
    fullPage: true,
  })
  await sidebar.getByRole('link', { name: 'Warga', exact: true }).click()
  await expect(page).toHaveURL(/\/warga\/profil$/)
  await expect(
    page.getByRole('heading', { name: 'Profil warga', exact: true }),
  ).toBeVisible()
  await sidebar
    .getByRole('link', { name: 'Pengajuan Surat', exact: true })
    .click()
  await expect(
    page.getByRole('heading', { name: 'Pengajuan Surat', exact: true }),
  ).toBeVisible()
  await expect(sidebar.locator('a[aria-current="page"]')).toHaveText(
    'Pengajuan Surat',
  )
  await sidebar.getByRole('link', { name: 'Dashboard', exact: true }).click()
  await page.reload()
  await expect(
    page.getByRole('heading', { name: 'Dashboard', exact: true }),
  ).toBeVisible()
  await page.getByRole('button', { name: /^Menu akun / }).click()
  await page.getByRole('button', { name: 'Keluar', exact: true }).click()
  await expect(page).toHaveURL(/\/login$/)
  expect(calls.logout).toBe(true)
  await page.goBack()
  for (const path of [
    '/warga',
    '/warga/profil',
    '/warga/pengumuman',
    '/admin/pengumuman',
    '/warga/pengajuan-surat',
    '/warga/iuran-warga',
    '/warga/pengaduan',
  ]) {
    await page.goto(path)
    await expect(page).toHaveURL(/\/login$/)
    await expect(
      page.getByRole('complementary', { name: 'Sidebar admin' }),
    ).toHaveCount(0)
  }
  await expect(page.getByText(profile.nik, { exact: true })).toHaveCount(0)
  const tokens = await page.evaluate(() =>
    [...Object.keys(localStorage), ...Object.keys(sessionStorage)].filter(
      (key) => key.endsWith('-auth-token'),
    ),
  )
  expect(tokens).toEqual([])
})

test('desktop sidebar toggles with the keyboard and keeps icon navigation accessible', async ({
  page,
}) => {
  await mockSupabase(page)
  await login(page)
  const sidebar = page.getByRole('complementary', { name: 'Sidebar admin' })
  const collapse = page.getByRole('button', {
    name: 'Ciutkan sidebar',
    exact: true,
  })
  const expand = page.getByRole('button', {
    name: 'Perluas sidebar',
    exact: true,
  })
  const labels = [
    'Dashboard',
    'Warga',
    'Pengajuan Surat',
    'Iuran Warga',
    'Pengaduan',
    'Pengumuman',
  ]

  for (const width of [1024, 1280]) {
    await page.setViewportSize({ width, height: 900 })
    for (const dir of ['ltr', 'rtl']) {
      await page.evaluate((direction) => {
        document.documentElement.dir = direction
      }, dir)
      await expect(collapse).toHaveAttribute('aria-expanded', 'true')
      expect((await sidebar.boundingBox())!.width).toBe(264)
      const controlledId = await collapse.getAttribute('aria-controls')
      expect(await sidebar.evaluate((node) => node.parentElement?.id)).toBe(
        controlledId,
      )

      await collapse.focus()
      await page.keyboard.press('Enter')
      await expect(expand).toBeFocused()
      await expect(expand).toHaveAttribute('aria-expanded', 'false')
      expect((await sidebar.boundingBox())!.width).toBe(80)
      await expect(sidebar.getByRole('link')).toHaveCount(6)
      for (const label of labels) {
        const link = sidebar.getByRole('link', { name: label, exact: true })
        await expect(link).toBeVisible()
        await expect(link).toHaveAttribute('title', label)
        expect(
          (await link.locator('span').boundingBox())!.width,
        ).toBeLessThanOrEqual(1)
      }
      const residentLink = sidebar.getByRole('link', {
        name: 'Warga',
        exact: true,
      })
      await residentLink.focus()
      await page.keyboard.press('Enter')
      await expect(page).toHaveURL(/\/warga\/profil$/)
      await expect(residentLink).toHaveAttribute('aria-current', 'page')
      await expect(expand).toHaveAttribute('aria-expanded', 'false')
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width)
      if (width === 1280 && dir === 'ltr') {
        await page.screenshot({
          path: 'test-results/authenticated-sidebar-collapsed.png',
          fullPage: true,
        })
      }

      await expand.focus()
      await page.keyboard.press('Space')
      await expect(collapse).toBeFocused()
      await expect(collapse).toHaveAttribute('aria-expanded', 'true')
      expect((await sidebar.boundingBox())!.width).toBe(264)
      await expect(
        sidebar.getByRole('link', { name: 'WargaKita — dashboard admin' }),
      ).toBeVisible()
      expect(
        (await residentLink.locator('span').boundingBox())!.width,
      ).toBeGreaterThan(1)
    }
  }
})

test('a collapsed desktop sidebar keeps the full mobile drawer when the viewport changes', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await mockSupabase(page)
  await login(page)
  await page
    .getByRole('button', { name: 'Ciutkan sidebar', exact: true })
    .click()
  await page.setViewportSize({ width: 375, height: 900 })
  await expect(
    page.getByRole('button', { name: 'Perluas sidebar', exact: true }),
  ).not.toBeVisible()
  const trigger = page.getByRole('button', {
    name: 'Buka menu navigasi',
    exact: true,
  })
  await trigger.click()
  const drawer = page.getByRole('dialog', {
    name: 'Menu navigasi',
    exact: true,
  })
  await expect(drawer).toBeVisible()
  const residentLink = drawer.getByRole('link', { name: 'Warga', exact: true })
  expect(
    (await residentLink.locator('span').boundingBox())!.width,
  ).toBeGreaterThan(1)
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(375)
  await page.keyboard.press('Escape')
  await expect(drawer).not.toBeVisible()
  await expect(trigger).toBeFocused()
  await page.setViewportSize({ width: 1280, height: 900 })
  await expect(
    page.getByRole('button', { name: 'Perluas sidebar', exact: true }),
  ).toHaveAttribute('aria-expanded', 'false')
  expect(
    (await page
      .getByRole('complementary', { name: 'Sidebar admin' })
      .boundingBox())!.width,
  ).toBe(80)
})

test('the sidebar opens on mobile and closes with its button, backdrop, Escape, or navigation', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 780 })
  await mockSupabase(page)
  await login(page)
  await expect(page).toHaveURL(/\/warga$/)
  const trigger = page.getByRole('button', { name: 'Buka menu navigasi' })
  const drawer = page.getByRole('dialog', {
    name: 'Menu navigasi',
    exact: true,
  })
  await expect(trigger).toBeVisible()
  await expect(
    page.getByRole('navigation', { name: 'Navigasi admin' }),
  ).toHaveCount(0)
  await trigger.click()
  await expect(drawer).toBeVisible()
  await page.screenshot({
    path: 'test-results/authenticated-sidebar-mobile.png',
    fullPage: true,
  })
  await drawer.getByRole('button', { name: 'Tutup menu navigasi' }).click()
  await expect(drawer).not.toBeVisible()
  await expect(trigger).toBeFocused()
  await trigger.click()
  await expect(drawer).toBeVisible()
  await page.mouse.click(344, 390)
  await expect(drawer).not.toBeVisible()
  await expect(trigger).toBeFocused()
  await trigger.click()
  await page.keyboard.press('Escape')
  await expect(drawer).not.toBeVisible()
  await expect(trigger).toBeFocused()
  await trigger.click()
  await drawer.getByRole('link', { name: 'Warga', exact: true }).click()
  await expect(page).toHaveURL(/\/warga\/profil$/)
  await expect(drawer).not.toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Profil warga', exact: true }),
  ).toBeVisible()
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(360)
  await page.screenshot({
    path: 'test-results/authenticated-home-mobile.png',
    fullPage: true,
  })
})

test('account actions support keyboard navigation, dismissal, and sign-out', async ({
  page,
}) => {
  const calls = await mockSupabase(page)
  await login(page)
  const trigger = page.getByRole('button', {
    name: 'Menu akun Warga Uji, Warga',
    exact: true,
  })
  const actions = page.getByRole('group', {
    name: 'Tindakan akun',
    exact: true,
  })
  await expect(actions).not.toBeVisible()
  await trigger.focus()
  await page.keyboard.press('Enter')
  await expect(actions).toBeVisible()
  await expect(trigger).toMatchAriaSnapshot(
    '- button "Menu akun Warga Uji, Warga" [expanded]',
  )
  await page.keyboard.press('Tab')
  await expect(
    actions.getByRole('button', { name: 'Ubah data diri', exact: true }),
  ).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(
    actions.getByRole('button', { name: 'Keluar', exact: true }),
  ).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(actions).not.toBeVisible()
  await expect(trigger).toBeFocused()
  await page.keyboard.press('Space')
  await expect(actions).toBeVisible()
  await page.keyboard.press('Tab')
  await page.keyboard.press('Tab')
  await page.keyboard.press('Tab')
  await expect(actions).not.toBeVisible()
  await trigger.click()
  await page.getByRole('heading', { name: 'Dashboard', exact: true }).click()
  await expect(actions).not.toBeVisible()
  await trigger.click()
  await actions.getByRole('button', { name: 'Keluar', exact: true }).click()
  await expect(page).toHaveURL(/\/login$/)
  expect(calls.logout).toBe(true)
})

test('long account names remain readable in the submenu at narrow widths and enlarged text', async ({
  page,
}) => {
  const fullName =
    'Warga Dengan Nama Lengkap Yang Sangat Panjang Untuk Pemeriksaan Layout'
  await mockSupabase(page, { fullName })
  await login(page)
  const trigger = page.getByRole('button', {
    name: `Menu akun ${fullName}, Warga`,
    exact: true,
  })
  const actions = page.getByRole('group', {
    name: 'Tindakan akun',
    exact: true,
  })
  for (const width of [320, 360, 528, 768, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 })
    for (const dir of ['ltr', 'rtl']) {
      for (const fontSize of ['100%', '200%']) {
        await page.evaluate(
          ({ dir, fontSize }) => {
            document.documentElement.dir = dir
            document.documentElement.style.fontSize = fontSize
          },
          { dir, fontSize },
        )
        await trigger.click()
        await expect(actions.getByText(fullName, { exact: true })).toBeVisible()
        for (const element of [
          trigger,
          actions,
          actions.getByRole('button', { name: 'Keluar', exact: true }),
        ]) {
          await element.scrollIntoViewIfNeeded()
          const box = (await element.boundingBox())!
          expect(box.x, `${width}px ${dir} ${fontSize}`).toBeGreaterThanOrEqual(
            0,
          )
          expect(
            box.x + box.width,
            `${width}px ${dir} ${fontSize}`,
          ).toBeLessThanOrEqual(width + 1)
          expect(box.y, `${width}px ${dir} ${fontSize}`).toBeGreaterThanOrEqual(
            0,
          )
          expect(
            box.y + box.height,
            `${width}px ${dir} ${fontSize}`,
          ).toBeLessThanOrEqual(901)
        }
        if (
          [320, 360, 1440].includes(width) &&
          dir === 'ltr' &&
          fontSize === '100%'
        )
          await page.screenshot({
            path: `test-results/account-menu-${width}.png`,
          })
        await page.keyboard.press('Escape')
      }
    }
  }
})

test('remember me selects persistent storage, unchecked uses tab storage', async ({
  page,
}) => {
  await mockSupabase(page)
  await login(page)
  await expect(page).toHaveURL(/\/warga$/)
  expect(
    await page.evaluate(() =>
      Object.keys(sessionStorage).some((key) => key.endsWith('-auth-token')),
    ),
  ).toBe(true)
  expect(
    await page.evaluate(() =>
      Object.keys(localStorage).some((key) => key.endsWith('-auth-token')),
    ),
  ).toBe(false)
  await page.getByRole('button', { name: /^Menu akun / }).click()
  await page.getByRole('button', { name: 'Keluar', exact: true }).click()
  await expect(page).toHaveURL(/\/login$/)
  await page.getByLabel('Email', { exact: true }).fill(user.email)
  await page.getByLabel('Password', { exact: true }).fill('PasswordUji123!')
  await page.getByLabel('Ingat saya').check()
  await page.getByRole('button', { name: 'Masuk', exact: true }).click()
  await expect(page).toHaveURL(/\/warga$/)
  expect(
    await page.evaluate(() =>
      Object.keys(localStorage).some((key) => key.endsWith('-auth-token')),
    ),
  ).toBe(true)
})

test('wrong credentials retain input and show a safe error', async ({
  page,
}) => {
  await mockSupabase(page, { invalidPassword: true })
  await login(page)
  await expect(page.getByRole('alert')).toContainText(
    'Email atau password tidak sesuai',
  )
  await expect(page.getByLabel('Email', { exact: true })).toHaveValue(
    user.email,
  )
  await expect(page).toHaveURL(/\/login$/)
})

test('inactive profile and data failures never reveal protected content', async ({
  page,
}) => {
  await mockSupabase(page, { disabled: true })
  await login(page)
  await expect(
    page.getByRole('heading', { name: 'Akses belum tersedia' }),
  ).toBeVisible()
  await expect(page.getByText(profile.nik, { exact: true })).toHaveCount(0)
  await expect(page.getByRole('alert')).toContainText('akun dinonaktifkan')
  await page.getByRole('button', { name: 'Keluar', exact: true }).click()
  await expect(page).toHaveURL(/\/login$/)
})

test('a failed profile read can be retried without exposing private data', async ({
  page,
}) => {
  const options = { profileFailure: true }
  await mockSupabase(page, options)
  await login(page)
  await expect(
    page.getByRole('heading', { name: 'Akses belum tersedia' }),
  ).toBeVisible()
  await expect(page.getByText(profile.nik, { exact: true })).toHaveCount(0)
  options.profileFailure = false
  await page.getByRole('button', { name: 'Coba lagi', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'Dashboard', exact: true }),
  ).toBeVisible()
})

test('registration rejects invalid identity and mismatched passwords before calling Auth', async ({
  page,
}) => {
  const calls = await mockSupabase(page)
  await fillRegistration(page)
  await page.getByLabel('NIK *', { exact: true }).fill('123')
  await page.getByLabel('Nomor Kartu Keluarga *', { exact: true }).fill('123')
  await page
    .getByLabel('Konfirmasi Password *', { exact: true })
    .fill('OtherPassword')
  await page.getByRole('button', { name: 'Daftar Akun', exact: true }).click()
  await expect(
    page.getByText('NIK harus berisi tepat 16 digit angka.'),
  ).toBeVisible()
  await expect(
    page.getByText('Nomor KK harus berisi tepat 16 digit angka.'),
  ).toBeVisible()
  await expect(page.getByText('Konfirmasi password harus sama.')).toBeVisible()
  await expect(page.getByLabel('NIK *', { exact: true })).toBeFocused()
  expect(calls.signup).toBeUndefined()
})

test('registration sends profile metadata and opens resident home without email confirmation', async ({
  page,
}) => {
  const calls = await mockSupabase(page)
  await fillRegistration(page)
  await page.getByRole('button', { name: 'Daftar Akun', exact: true }).click()
  await expect(page).toHaveURL(/\/warga$/)
  expect(calls.signup?.email).toBe(user.email)
  expect(calls.signup?.data).toMatchObject({
    full_name: profile.full_name,
    nik: profile.nik,
    family_card_number: profile.family_card_number,
  })
  expect(calls.signup?.data).not.toHaveProperty('role')
  expect(calls.signup?.data).not.toHaveProperty('house_block')
  expect(calls.signup?.data).not.toHaveProperty('password')
  expect(calls.signup).not.toHaveProperty('confirmation')
  await expect(page.getByText('Periksa email Anda')).toHaveCount(0)
  await page.getByRole('button', { name: /^Menu akun / }).click()
  await page.getByRole('button', { name: 'Keluar', exact: true }).click()
  await expect(page).toHaveURL(/\/login$/)
  await login(page)
  await expect(page).toHaveURL(/\/warga$/)
})

test('registration keeps fields and reports failure when Auth returns no session', async ({
  page,
}) => {
  await mockSupabase(page, { confirmationRequired: true })
  await fillRegistration(page)
  await page.getByRole('button', { name: 'Daftar Akun', exact: true }).click()
  await expect(page).toHaveURL(/\/register$/)
  await expect(page.getByRole('alert')).toContainText(
    'Permintaan belum berhasil',
  )
  await expect(page.getByLabel('Email *', { exact: true })).toHaveValue(
    user.email,
  )
  await expect(page.getByText('Periksa email Anda')).toHaveCount(0)
})

test('existing email confirmation links still exchange PKCE code and open protected home', async ({
  page,
}) => {
  await mockSupabase(page)
  await page.addInitScript(() => {
    localStorage.setItem(
      'sb-127-auth-token-code-verifier',
      JSON.stringify('dummy-code-verifier'),
    )
  })
  await page.goto('/auth/callback?code=dummy-confirmation-code')
  await expect(page).toHaveURL(/\/warga$/)
  await expect(
    page.getByRole('heading', {
      name: 'Dashboard',
      exact: true,
    }),
  ).toBeVisible()
  expect(
    await page.evaluate(() =>
      Object.keys(localStorage).some((key) =>
        key.endsWith('-auth-token-code-verifier'),
      ),
    ),
  ).toBe(false)
})

test('invalid confirmation links offer login without revealing protected content', async ({
  page,
}) => {
  await mockSupabase(page)
  await page.goto(
    '/auth/callback?error=access_denied&error_description=expired',
  )
  await expect(
    page.getByRole('heading', { name: 'Konfirmasi akun', exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('link', { name: 'Ke halaman masuk' }),
  ).toBeVisible()
  await expect(page.getByText(profile.nik, { exact: true })).toHaveCount(0)
})

test('registration failure retains fields and hides internal database errors', async ({
  page,
}) => {
  await mockSupabase(page, { signupFailure: true })
  await fillRegistration(page)
  await page.getByRole('button', { name: 'Daftar Akun', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText(
    'Permintaan belum berhasil',
  )
  await expect(page.getByLabel('Nama Lengkap *', { exact: true })).toHaveValue(
    profile.full_name,
  )
  await expect(
    page.getByLabel('Nomor Kartu Keluarga *', { exact: true }),
  ).toHaveValue(profile.family_card_number)
  await expect(page.getByText('internal database details')).toHaveCount(0)
})

test('password controls and accessible help dialog work with keyboard', async ({
  page,
}) => {
  await mockSupabase(page)
  await page.goto('/login')
  await page
    .getByRole('button', { name: 'Tampilkan password', exact: true })
    .click()
  await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute(
    'type',
    'text',
  )
  await page.getByRole('button', { name: 'Lupa password?' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Lupa password?' }),
  ).toBeFocused()
})

for (const width of [320, 375, 768, 1280, 1440, 1648]) {
  test(`auth layouts fit ${width}px without horizontal overflow`, async ({
    page,
  }) => {
    await mockSupabase(page)
    await page.setViewportSize({ width, height: 928 })
    for (const path of ['/login', '/register']) {
      await page.goto(path)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await page.evaluate(() => document.fonts.ready)
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width)
      const card = page.getByRole('region', {
        name: path === '/login' ? 'Selamat Datang!' : 'Buat Akun Warga',
      })
      if (width === 1440) {
        const bounds = await card.boundingBox()
        expect(bounds?.width).toBe(path === '/login' ? 560 : 900)
      }
      await page.screenshot({
        path: `test-results/${path.slice(1)}-${width}.png`,
        fullPage: true,
      })
    }
  })
}
