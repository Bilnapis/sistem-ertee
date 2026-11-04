import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import type {
  ResidentProfile,
  ResidentRole,
} from '../../src/lib/database.types'
import type {
  DuesConfiguration,
  DuesDetail,
  DuesInvoice,
  DuesPayment,
  DuesStatus,
} from '../../src/features/dues/types'

const uid = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
type Options = {
  role?: ResidentRole
  status?: DuesStatus
  bankMissing?: boolean
  uploadFailure?: boolean
  lostSubmission?: boolean
  listFailure?: boolean
  staleReview?: boolean
  empty?: boolean
}
async function mockDues(page: Page, options: Options = {}) {
  const role = options.role ?? 'warga',
    manager = role !== 'warga',
    actor = manager ? uid(role === 'ketua_rt' ? 1 : 2) : uid(3)
  const profile: ResidentProfile = {
    id: actor,
    email: 'dummy@example.test',
    full_name: manager ? 'Pengurus Dummy' : 'Budi Dummy',
    role,
    nik: '0000000000000003',
    phone: '081234567890',
    address: 'Jalan Dummy Nomor 1',
    house_block: 'DUMMY-C',
    house_number: '12',
    family_card_number: null,
    gender: null,
    marital_status: null,
    is_active: true,
    verification_status: 'menunggu_verifikasi',
    archived_at: null,
    reviewed_by: null,
    reviewed_at: null,
    review_note: null,
    created_by: null,
    created_at: '2026-11-01T00:00:00Z',
    updated_at: '2026-11-01T00:00:00Z',
  }
  const user = {
    id: actor,
    aud: 'authenticated',
    role: 'authenticated',
    email: profile.email,
    email_confirmed_at: profile.created_at,
    created_at: profile.created_at,
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: {},
    identities: [],
  }
  const token = `${Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')}.${Buffer.from(JSON.stringify({ sub: actor, role: 'authenticated', session_id: actor.replace('8000', '9000'), exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.dummy-signature`
  const session = {
    access_token: token,
    refresh_token: 'dummy-refresh',
    token_type: 'bearer',
    expires_in: 3600,
    user,
  }
  const rate = {
    effective_month: '2026-11-01',
    amount: 50000,
    due_day: 10,
    updated_by: null,
  }
  const configuration: DuesConfiguration = {
    activated_month: '2026-11-01',
    bank_name: options.bankMissing ? '' : 'Bank Dummy',
    bank_account: options.bankMissing ? '' : '1234567890',
    bank_holder: options.bankMissing ? '' : 'Pengurus Dummy',
    updated_at: '2026-11-01T00:00:00Z',
    current_rate: rate,
    next_rate: rate,
    next_month: '2026-12-01',
  }
  const invoices: DuesInvoice[] = options.empty
    ? []
    : Array.from({ length: manager ? 14 : 4 }, (_, i) => ({
        id: uid(100 + i),
        resident_id: manager ? uid(3 + i) : actor,
        identity_snapshot: {
          full_name: i === 0 ? 'Budi Dummy' : `Warga Dummy ${i + 3}`,
          house_block: 'DUMMY-C',
          house_number: String(12 + i),
        },
        period: manager
          ? '2026-11-01'
          : `2026-${String(11 - i).padStart(2, '0')}-01`,
        amount: 50000,
        due_date: `2026-${String(manager ? 11 : 11 - i).padStart(2, '0')}-10`,
        status: i === 0 ? (options.status ?? 'belum_bayar') : 'lunas',
        method:
          i === 0
            ? options.status && options.status !== 'belum_bayar'
              ? 'tunai'
              : null
            : 'tunai',
        payment_date: i === 0 ? null : '2026-10-08',
        created_at: `2026-11-01T00:00:${String(20 - i).padStart(2, '0')}Z`,
        updated_at: '2026-11-01T00:00:00Z',
      }))
  let revision = 0
  const now = () =>
    new Date(Date.UTC(2026, 10, 4, 2, 0, ++revision)).toISOString()
  const payments: DuesPayment[] = []
  const events: DuesDetail['events'] = []
  const requests: { path: string; body: Record<string, unknown> }[] = []
  const files = new Map<string, { bytes: Buffer; type: string }>()
  if (options.status && options.status !== 'belum_bayar')
    payments.push({
      id: uid(201),
      invoice_id: uid(100),
      method: 'tunai',
      payment_date: '2026-11-04',
      notes: 'Setoran dummy',
      attachment: null,
      bank_snapshot: null,
      status: options.status === 'lunas' ? 'disetujui' : 'diajukan',
      submitted_by: uid(3),
      reviewed_by: null,
      reviewed_at: options.status === 'lunas' ? '2026-11-04T00:00:00Z' : null,
      review_note: '',
      cancelled_by: null,
      cancelled_at: null,
      cancellation_note: '',
      created_at: now(),
      updated_at: now(),
    })
  const canRead = (invoice: DuesInvoice) =>
    manager || invoice.resident_id === actor
  const detail = (id: string) => ({
    invoice: invoices.find((invoice) => invoice.id === id)!,
    payments: payments
      .filter((payment) => payment.invoice_id === id)
      .toReversed(),
    events: events.filter((event) => event.invoice_id === id),
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
    if (path.includes('/storage/v1/object/')) {
      const key = path.split('/dues-proofs/')[1]
      requests.push({ path, body: { method: request.method() } })
      if (request.method() === 'POST') {
        if (options.uploadFailure) {
          options.uploadFailure = false
          return respond(
            {
              statusCode: '503',
              error: 'unavailable',
              message: 'Upload unavailable',
            },
            503,
          )
        }
        const multipart = await new Request(request.url(), {
          method: 'POST',
          headers: request.headers(),
          body: request.postDataBuffer()!,
        }).formData()
        const file = Array.from(multipart.values()).find(
          (value) => typeof value !== 'string',
        )
        if (file && typeof file !== 'string')
          files.set(key, {
            bytes: Buffer.from(await file.arrayBuffer()),
            type: file.type,
          })
        return respond({ Key: key, Id: uid(999) })
      }
      const file = files.get(key)
      if (file)
        return route.fulfill({
          status: 200,
          headers: { ...headers, 'content-type': file.type },
          body: file.bytes,
        })
      return respond(
        { statusCode: '404', error: 'not_found', message: 'Not found' },
        404,
      )
    }
    const body = request.postData()
      ? (request.postDataJSON() as Record<string, unknown>)
      : {}
    requests.push({ path, body })
    if (path.endsWith('/token')) return respond(session)
    if (path.endsWith('/user')) return respond(user)
    if (path.endsWith('/profiles')) return respond([profile])
    if (path.endsWith('/resident_events')) return respond([])
    if (path.endsWith('/logout')) return route.fulfill({ status: 204, headers })
    if (path.endsWith('/dues_configuration')) return respond(configuration)
    if (path.endsWith('/dues_overview')) {
      if (options.listFailure) return respond({ message: 'Unavailable' }, 503)
      if (body.p_scope === 'all' && !manager)
        return respond({ code: '42501' }, 403)
      const rows = invoices.filter(
        (invoice) =>
          (body.p_scope === 'all' || invoice.resident_id === actor) &&
          (!body.p_period || invoice.period === body.p_period) &&
          (body.p_status === 'all' || invoice.status === body.p_status) &&
          (body.p_method === 'all' || invoice.method === body.p_method) &&
          `${invoice.identity_snapshot.full_name} ${invoice.identity_snapshot.house_block}`
            .toLowerCase()
            .includes(String(body.p_search).toLowerCase()),
      )
      const selected = invoices.filter(
        (invoice) =>
          (body.p_scope === 'all' || invoice.resident_id === actor) &&
          invoice.period === (body.p_period ?? '2026-11-01'),
      )
      return respond({
        current:
          invoices.find(
            (invoice) =>
              invoice.resident_id === actor && invoice.period === '2026-11-01',
          ) ?? null,
        period: '2026-11-01',
        items: rows.slice(
          (Number(body.p_page) - 1) * 10,
          Number(body.p_page) * 10,
        ),
        total: rows.length,
        configuration,
        summary: {
          total: selected.length,
          belum_bayar: selected.filter((i) => i.status === 'belum_bayar')
            .length,
          menunggu_verifikasi: selected.filter(
            (i) => i.status === 'menunggu_verifikasi',
          ).length,
          lunas: selected.filter((i) => i.status === 'lunas').length,
          income:
            payments.filter((p) => p.status === 'disetujui').length * 50000,
        },
      })
    }
    if (path.endsWith('/dues_detail')) {
      const invoice = invoices.find(
        (invoice) => invoice.id === body.p_id && canRead(invoice),
      )
      return invoice
        ? respond(detail(invoice.id))
        : respond({ code: 'P0002' }, 404)
    }
    if (path.endsWith('/submit_dues_payment')) {
      const invoice = invoices.find(
        (invoice) =>
          invoice.id === body.p_invoice_id && invoice.resident_id === actor,
      )
      if (!invoice) return respond({ code: 'P0002' }, 404)
      let payment = payments.find((payment) => payment.id === body.p_request_id)
      if (!payment) {
        if (invoice.status !== 'belum_bayar')
          return respond({ code: '40001', message: 'DUES_PAYMENT_EXISTS' }, 409)
        payment = {
          id: String(body.p_request_id),
          invoice_id: invoice.id,
          method: body.p_method as DuesPayment['method'],
          payment_date: String(body.p_payment_date),
          notes: String(body.p_notes),
          attachment: body.p_attachment as DuesPayment['attachment'],
          bank_snapshot:
            body.p_method === 'transfer'
              ? {
                  bank_name: configuration.bank_name,
                  bank_account: configuration.bank_account,
                  bank_holder: configuration.bank_holder,
                }
              : null,
          status: 'diajukan',
          submitted_by: actor,
          reviewed_by: null,
          reviewed_at: null,
          review_note: '',
          cancelled_by: null,
          cancelled_at: null,
          cancellation_note: '',
          created_at: now(),
          updated_at: now(),
        }
        payments.push(payment)
        invoice.status = 'menunggu_verifikasi'
        invoice.method = payment.method
        events.push({
          id: events.length + 1,
          invoice_id: invoice.id,
          payment_id: payment.id,
          action: 'diajukan',
          actor_id: actor,
          actor_name: profile.full_name,
          actor_role: role,
          note: payment.notes,
          details: {},
          occurred_at: now(),
        })
      }
      if (options.lostSubmission) {
        options.lostSubmission = false
        return respond({ message: 'Lost response' }, 503)
      }
      return respond(detail(invoice.id))
    }
    if (path.endsWith('/review_dues_payment')) {
      if (!manager) return respond({ code: '42501' }, 403)
      if (options.staleReview) {
        options.staleReview = false
        return respond({ code: '40001', message: 'STALE_DUES' }, 409)
      }
      const payment = payments.find(
          (payment) => payment.id === body.p_payment_id,
        )!,
        invoice = invoices.find((invoice) => invoice.id === payment.invoice_id)!
      payment.status = body.p_action as DuesPayment['status']
      payment.updated_at = now()
      if (payment.status === 'dibatalkan') {
        payment.cancelled_at = now()
        payment.cancellation_note = String(body.p_note)
      } else {
        payment.reviewed_at = now()
        payment.review_note = String(body.p_note)
      }
      invoice.status = payment.status === 'disetujui' ? 'lunas' : 'belum_bayar'
      invoice.payment_date =
        invoice.status === 'lunas' ? payment.payment_date : null
      events.push({
        id: events.length + 1,
        invoice_id: invoice.id,
        payment_id: payment.id,
        action: payment.status,
        actor_id: actor,
        actor_name: profile.full_name,
        actor_role: role,
        note: String(body.p_note),
        details: {},
        occurred_at: now(),
      })
      return respond(detail(invoice.id))
    }
    if (path.endsWith('/update_dues_configuration')) {
      if (!manager) return respond({ code: '42501' }, 403)
      configuration.next_rate = {
        effective_month: configuration.next_month,
        amount: Number(body.p_amount),
        due_day: Number(body.p_due_day),
        updated_by: actor,
      }
      configuration.bank_name = String(body.p_bank_name)
      configuration.bank_account = String(body.p_bank_account)
      configuration.bank_holder = String(body.p_bank_holder)
      configuration.updated_at = now()
      return respond(configuration)
    }
    return respond({}, 404)
  })
  await page.goto('/login')
  await page.getByLabel('Email', { exact: true }).fill(profile.email)
  await page.getByLabel('Password', { exact: true }).fill('DummyPassword123!')
  await page.getByRole('button', { name: 'Masuk', exact: true }).click()
  await expect(page).toHaveURL(/\/warga$/)
  await page.goto(manager ? '/admin/iuran-warga' : '/warga/iuran-warga')
  await expect(
    page.getByRole('heading', { name: 'Iuran Warga', exact: true }),
  ).toBeVisible()
  return { invoices, payments, requests, configuration, options }
}
async function openPayment(page: Page) {
  await page.getByRole('link', { name: 'Bayar Iuran', exact: true }).click()
  return page.getByRole('dialog', { name: 'Pembayaran Iuran', exact: true })
}

test('unverified resident confirms cash without a proof; status waits for manager', async ({
  page,
}) => {
  const state = await mockDues(page)
  const form = await openPayment(page)
  await expect(form.getByLabel('Tunai/Cash', { exact: true })).toBeChecked()
  await expect(form.locator('input[type=file]')).toHaveCount(0)
  await form
    .getByLabel('Catatan pembayaran (opsional)')
    .fill('Sudah disetor kepada pengurus')
  await form.getByRole('button', { name: 'Kirim Konfirmasi Tunai' }).click()
  await expect(
    page.getByRole('dialog', { name: 'Detail Iuran' }),
  ).toContainText('Menunggu Verifikasi')
  expect(state.payments).toHaveLength(1)
  expect(state.payments[0].attachment).toBeNull()
  expect(state.payments[0].status).toBe('diajukan')
  expect(
    state.requests.find((r) => r.path.endsWith('submit_dues_payment'))?.body,
  ).not.toHaveProperty('p_resident_id')
})
test('transfer requires proof and uploads a private file; a failed upload can be retried', async ({
  page,
}) => {
  const state = await mockDues(page, { uploadFailure: true })
  const form = await openPayment(page)
  await form.getByLabel('Transfer', { exact: true }).check()
  await expect(form).toContainText('1234567890')
  await form.getByRole('button', { name: 'Kirim Bukti Pembayaran' }).click()
  expect(state.payments).toHaveLength(0)
  await form.getByLabel('Unggah Bukti Pembayaran').setInputFiles({
    name: 'bukti.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4\nDummy'),
  })
  await form.getByRole('button', { name: 'Kirim Bukti Pembayaran' }).click()
  await expect(
    form.getByText('Permintaan belum berhasil.', { exact: false }),
  ).toBeVisible()
  expect(state.payments).toHaveLength(0)
  await form.getByRole('button', { name: 'Kirim Bukti Pembayaran' }).click()
  await expect(
    page.getByRole('dialog', { name: 'Detail Iuran' }),
  ).toContainText('bukti.pdf')
  expect(state.payments[0].attachment?.path).toMatch(
    /^[\w-]+\/[\w-]+\/[a-f0-9]{64}\.pdf$/,
  )
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Unduh bukti: bukti.pdf' }).click()
  expect((await download).suggestedFilename()).toBe('bukti.pdf')
})
test('lost submission response retries with the same id and preserves the form', async ({
  page,
}) => {
  const state = await mockDues(page, { lostSubmission: true })
  const form = await openPayment(page)
  await form.getByLabel('Catatan pembayaran (opsional)').fill('Catatan tetap')
  await form.getByRole('button', { name: 'Kirim Konfirmasi Tunai' }).click()
  await expect(
    form.getByText('Permintaan belum berhasil.', { exact: false }),
  ).toBeVisible()
  await expect(form.getByLabel('Catatan pembayaran (opsional)')).toHaveValue(
    'Catatan tetap',
  )
  await form.getByRole('button', { name: 'Kirim Konfirmasi Tunai' }).click()
  await expect(page.getByRole('dialog', { name: 'Detail Iuran' })).toBeVisible()
  expect(state.payments).toHaveLength(1)
  const submissions = state.requests.filter((r) =>
    r.path.endsWith('submit_dues_payment'),
  )
  expect(submissions[0].body.p_request_id).toBe(
    submissions[1].body.p_request_id,
  )
})
test('resident can submit a replacement after a rejection without losing the earlier attempt', async ({
  page,
}) => {
  const state = await mockDues(page, { status: 'menunggu_verifikasi' })
  state.payments[0].status = 'ditolak'
  state.payments[0].review_note = 'Uang tunai belum diterima'
  state.invoices[0].status = 'belum_bayar'
  await page.reload()
  const form = await openPayment(page)
  await form.getByRole('button', { name: 'Kirim Konfirmasi Tunai' }).click()
  const dialog = page.getByRole('dialog', { name: 'Detail Iuran' })
  await expect(dialog.getByText('Ditolak', { exact: true })).toBeVisible()
  await expect(
    dialog.getByText('Catatan pengurus: Uang tunai belum diterima'),
  ).toBeVisible()
  expect(state.payments).toHaveLength(2)
  expect(state.payments[1].id).not.toBe(state.payments[0].id)
})

test('missing bank disables transfer while cash stays available; Escape restores focus', async ({
  page,
}) => {
  await mockDues(page, { bankMissing: true })
  const form = await openPayment(page)
  await expect(form.getByLabel('Transfer', { exact: true })).toBeDisabled()
  await expect(
    form.getByRole('button', { name: 'Kirim Konfirmasi Tunai' }),
  ).toBeEnabled()
  await page.keyboard.press('Escape')
  await expect(form).not.toBeVisible()
  await expect(
    page.getByRole('link', { name: 'Bayar Iuran', exact: true }),
  ).toBeFocused()
})
for (const role of ['ketua_rt', 'pengurus_rt'] as const)
  test(`${role} approves and cancels with a reason, retaining history`, async ({
    page,
  }) => {
    const state = await mockDues(page, { role, status: 'menunggu_verifikasi' })
    await page
      .getByRole('link', { name: /Lihat detail November 2026, Budi/ })
      .click()
    const dialog = page.getByRole('dialog', { name: 'Detail Iuran' })
    await dialog
      .getByRole('button', { name: 'Sahkan pembayaran', exact: true })
      .click()
    await expect(dialog.getByText('Lunas', { exact: true })).toBeVisible()
    expect(state.invoices[0].status).toBe('lunas')
    await dialog
      .getByRole('button', { name: 'Batalkan pembayaran', exact: true })
      .click()
    await dialog
      .getByRole('button', { name: 'Ya, batalkan pembayaran' })
      .click()
    await expect(
      dialog.getByText('Isi alasan penolakan atau pembatalan.', {
        exact: true,
      }),
    ).toBeVisible()
    await dialog
      .getByLabel('Catatan pengurus / alasan')
      .fill('Penerimaan keliru')
    await dialog
      .getByRole('button', { name: 'Ya, batalkan pembayaran' })
      .click()
    await expect(dialog.getByText('Belum Bayar', { exact: true })).toBeVisible()
    expect(state.payments[0].cancellation_note).toBe('Penerimaan keliru')
  })
test('rejection returns invoice to unpaid; stale reviews show a reload action', async ({
  page,
}) => {
  const state = await mockDues(page, {
    role: 'pengurus_rt',
    status: 'menunggu_verifikasi',
    staleReview: true,
  })
  await page
    .getByRole('link', { name: /Lihat detail November 2026, Budi/ })
    .click()
  const dialog = page.getByRole('dialog', { name: 'Detail Iuran' })
  await dialog
    .getByRole('button', { name: 'Sahkan pembayaran', exact: true })
    .click()
  await expect(
    dialog.getByText('Data sudah berubah.', { exact: false }),
  ).toBeVisible()
  await dialog.getByRole('button', { name: 'Muat ulang', exact: true }).click()
  await dialog
    .getByRole('button', { name: 'Tolak konfirmasi', exact: true })
    .click()
  await dialog
    .getByLabel('Catatan pengurus / alasan')
    .fill('Uang tunai belum diterima')
  await dialog.getByRole('button', { name: 'Ya, tolak konfirmasi' }).click()
  await expect(dialog.getByText('Belum Bayar', { exact: true })).toBeVisible()
  expect(state.payments[0].status).toBe('ditolak')
})
test('admin filtering and pagination; settings retain current rate and schedule next month', async ({
  page,
}) => {
  const state = await mockDues(page, { role: 'ketua_rt' })
  await expect(page.getByRole('table').locator('tbody tr')).toHaveCount(10)
  await page.getByRole('button', { name: 'Halaman berikutnya' }).click()
  await expect(page.getByRole('table').locator('tbody tr')).toHaveCount(4)
  await page.getByRole('searchbox', { name: 'Cari warga' }).fill('Budi')
  await expect(page.getByRole('table').locator('tbody tr')).toHaveCount(1)
  await page.getByRole('link', { name: 'Pengaturan iuran' }).click()
  const dialog = page.getByRole('dialog', { name: 'Pengaturan Iuran' })
  await expect(dialog).toContainText('Desember 2026')
  await dialog.getByLabel('Tarif bulanan (Rp)').fill('75000')
  await dialog.getByLabel('Tanggal jatuh tempo').fill('15')
  await dialog.getByRole('button', { name: 'Simpan pengaturan' }).click()
  await expect(dialog).not.toBeVisible()
  expect(state.configuration.current_rate.amount).toBe(50000)
  expect(state.configuration.next_rate.amount).toBe(75000)
  expect(state.configuration.next_rate.due_day).toBe(15)
})
test('resident routes deny admin access and inaccessible detail is explained', async ({
  page,
}) => {
  await mockDues(page)
  await page.goto('/admin/iuran-warga')
  await expect(
    page.getByRole('heading', { name: 'Akses ditolak' }),
  ).toBeVisible()
  await page.goto(`/warga/iuran-warga/${uid(999)}`)
  await expect(page.getByRole('dialog')).toContainText(
    'Tagihan tidak ditemukan atau tidak dapat diakses.',
  )
})
test('list failure retries and an empty list is explicit', async ({ page }) => {
  const state = await mockDues(page, { listFailure: true, empty: true })
  await expect(
    page.getByText('Permintaan belum berhasil.', { exact: false }),
  ).toBeVisible()
  state.options.listFailure = false
  await page.getByRole('button', { name: 'Coba lagi', exact: true }).click()
  await expect(
    page.getByText('Belum ada tagihan untuk bulan ini.'),
  ).toBeVisible()
  await expect(page.getByText('Tidak ada tagihan yang sesuai.')).toBeVisible()
})
for (const width of [320, 375, 768, 1280, 1648])
  test(`responsive design and keyboard dialog at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1056 })
    const state = await mockDues(page)
    await expect(page.locator('body')).toHaveJSProperty('scrollWidth', width)
    await page.screenshot({
      path: `test-results/dues-unpaid-${width}.png`,
      fullPage: true,
    })
    const form = await openPayment(page)
    await form.getByLabel('Transfer', { exact: true }).check()
    await expect(form).toBeVisible()
    if (width === 1648) {
      const geometry = await form.evaluate((node) => ({
        width: node.getBoundingClientRect().width,
        radius: getComputedStyle(node).borderRadius,
        padding: getComputedStyle(node).padding,
      }))
      expect(geometry).toEqual({ width: 648, radius: '22px', padding: '28px' })
    }
    expect(
      await form.evaluate((node) => node.scrollWidth <= node.clientWidth),
    ).toBe(true)
    await page.screenshot({
      path: `test-results/dues-payment-${width}.png`,
      fullPage: false,
    })
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab')
      expect(
        await page.evaluate(() =>
          document
            .querySelector('dialog[open]')
            ?.contains(document.activeElement),
        ),
      ).toBe(true)
    }
    await page.keyboard.press('Escape')
    await expect(form).not.toBeVisible()
    state.invoices[0].status = 'lunas'
    state.invoices[0].method = 'tunai'
    await page.reload()
    await expect(
      page.getByText('Pembayaran November 2026 telah diverifikasi pengurus.'),
    ).toBeVisible()
    await page.screenshot({
      path: `test-results/dues-paid-${width}.png`,
      fullPage: true,
    })
  })
