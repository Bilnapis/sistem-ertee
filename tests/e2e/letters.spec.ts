import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import type {
  LetterEvent,
  LetterRequest,
  ResidentProfile,
  ResidentRole,
} from '../../src/lib/database.types'

const uid = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const labels = {
  domisili: 'Surat Pengantar Domisili',
  usaha: 'Surat Pengantar Usaha',
  skck: 'Surat Pengantar SKCK',
  tidak_mampu: 'Surat Pengantar Tidak Mampu',
  pindah: 'Surat Pengantar Pindah',
  administrasi_kependudukan: 'Surat Pengantar Administrasi Kependudukan',
  keterangan_warga: 'Surat Keterangan Warga',
  lainnya: 'Lainnya',
}
type Options = {
  role?: ResidentRole
  unverified?: boolean
  listFailure?: boolean
  uploadFailure?: boolean
  lostUploadResponse?: boolean
  submitFailure?: boolean
  lostSubmitResponse?: boolean
  staleAdvance?: boolean
  empty?: boolean
}
async function mockLetters(page: Page, options: Options = {}) {
  const role = options.role ?? 'warga'
  const currentId =
    role === 'ketua_rt' ? uid(1) : role === 'pengurus_rt' ? uid(2) : uid(3)
  const profile: ResidentProfile = {
    id: currentId,
    full_name: role === 'warga' ? 'Warga Dummy 3' : 'Pengurus Dummy',
    email: 'dummy@example.test',
    role,
    nik: '0000000000000003',
    family_card_number: '0000000000000099',
    gender: 'laki_laki',
    marital_status: 'menikah',
    house_block: 'DUMMY-A',
    house_number: '03',
    phone: '081234567890',
    address: 'Jalan Dummy Nomor 3',
    is_active: true,
    archived_at: null,
    verification_status: options.unverified
      ? 'menunggu_verifikasi'
      : 'terverifikasi',
    reviewed_by: null,
    reviewed_at: null,
    review_note: null,
    created_by: null,
    created_at: '2026-11-03T00:00:00Z',
    updated_at: '2026-11-03T00:00:00Z',
  }
  const manager = role !== 'warga'
  const user = {
    id: currentId,
    aud: 'authenticated',
    role: 'authenticated',
    email: profile.email,
    email_confirmed_at: '2026-11-03T00:00:00Z',
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
  const requests: { path: string; body: Record<string, unknown> }[] = []
  const files = new Map<string, { bytes: Buffer; type: string }>()
  const letters: LetterRequest[] = options.empty
    ? []
    : Array.from({ length: 10 }, (_, i) => ({
        id: uid(100 + i),
        number: i + 1,
        reference: `SRT-${String(i + 1).padStart(3, '0')}`,
        applicant_id: i % 2 ? uid(4) : uid(3),
        identity_snapshot: {
          full_name: `Warga Dummy ${i % 2 ? 4 : 3}`,
          nik: '0000000000000003',
          family_card_number: '0000000000000099',
          address: 'Jalan Dummy Nomor 3',
          house_block: 'DUMMY-A',
          house_number: '03',
        },
        letter_type: i % 2 ? 'usaha' : 'domisili',
        letter_type_label: i % 2 ? labels.usaha : labels.domisili,
        purpose: 'Administrasi pekerjaan dummy',
        contact_phone: '081234567890',
        additional_notes: 'Keterangan pengujian',
        attachment: null,
        status:
          i % 3 === 0 ? 'pengajuan' : i % 3 === 1 ? 'diproses' : 'selesai',
        created_at: new Date(Date.UTC(2026, 10, 3, 10 - i)).toISOString(),
        updated_at: '2026-11-03T00:00:00.000Z',
      }))
  const history: LetterEvent[] = letters.map((request, i) => ({
    id: i + 1,
    request_id: request.id,
    previous_status: null,
    status: 'pengajuan',
    actor_id: request.applicant_id,
    actor_name: request.identity_snapshot.full_name,
    actor_role: 'warga',
    occurred_at: request.created_at,
  }))
  const canRead = (letter: LetterRequest) =>
    manager || letter.applicant_id === currentId
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
      requests.push({ path, body: { method: request.method() } })
      const objectName = path.split('/letter-attachments/')[1]
      if (request.method() === 'POST') {
        if (options.uploadFailure) {
          options.uploadFailure = false
          return respond(
            {
              statusCode: '503',
              message: 'Upload unavailable',
              error: 'unavailable',
            },
            503,
          )
        }
        const multipart = await new Request(request.url(), {
          method: 'POST',
          headers: request.headers(),
          body: request.postDataBuffer()!,
        }).formData()
        const uploadedFile = Array.from(multipart.values()).find(
          (value) => typeof value !== 'string',
        )
        if (uploadedFile && typeof uploadedFile !== 'string')
          files.set(objectName, {
            bytes: Buffer.from(await uploadedFile.arrayBuffer()),
            type: uploadedFile.type,
          })
        if (options.lostUploadResponse) {
          options.lostUploadResponse = false
          return respond(
            {
              statusCode: '503',
              message: 'Lost response',
              error: 'unavailable',
            },
            503,
          )
        }
        return respond({ Key: path.split('/object/')[1], Id: uid(999) })
      }
      const stored = files.get(objectName)
      if (stored && request.headers().authorization === `Bearer ${token}`)
        return route.fulfill({
          status: 200,
          headers: { ...headers, 'content-type': stored.type },
          body: stored.bytes,
        })
      return respond(
        { statusCode: '404', message: 'Not found', error: 'not_found' },
        404,
      )
    }
    const body = request.postData()
      ? (request.postDataJSON() as Record<string, unknown>)
      : {}
    requests.push({ path, body })
    if (path.endsWith('/token')) return respond(session)
    if (path.endsWith('/user')) return respond(user)
    if (path.endsWith('/logout')) return route.fulfill({ status: 204, headers })
    if (path.endsWith('/profiles')) return respond([profile])
    if (path.endsWith('/resident_events')) return respond([])
    if (path.endsWith('/letter_requests')) {
      const id = url.searchParams.get('id')?.replace(/^eq\./, '')
      const owner = url.searchParams.get('applicant_id')?.replace(/^eq\./, '')
      return respond(
        letters.filter(
          (letter) =>
            letter.id === id &&
            canRead(letter) &&
            (!owner || letter.applicant_id === owner),
        ),
      )
    }
    if (path.endsWith('/letter_events')) {
      const id = url.searchParams.get('request_id')?.replace(/^eq\./, '')
      return respond(
        letters.some((letter) => letter.id === id && canRead(letter))
          ? history.filter((event) => event.request_id === id)
          : [],
      )
    }
    if (path.endsWith('/list_letter_requests')) {
      if (options.listFailure)
        return respond({ code: 'unavailable', message: 'unavailable' }, 503)
      if (body.p_scope === 'all' && !manager)
        return respond({ code: '42501', message: 'ACCESS_DENIED' }, 403)
      const rows = letters
        .filter(
          (letter) =>
            (body.p_scope === 'all' || letter.applicant_id === currentId) &&
            (body.p_status === 'all' || letter.status === body.p_status) &&
            (body.p_type === 'all' || letter.letter_type === body.p_type) &&
            [
              letter.identity_snapshot.full_name,
              letter.reference,
              letter.letter_type_label,
            ].some((value) =>
              value.toLowerCase().includes(String(body.p_search).toLowerCase()),
            ),
        )
        .sort((a, b) =>
          body.p_sort === 'oldest'
            ? a.created_at.localeCompare(b.created_at)
            : b.created_at.localeCompare(a.created_at),
        )
      const offset = (Number(body.p_page) - 1) * 4
      return respond({
        items: rows.slice(offset, offset + 4),
        total: rows.length,
      })
    }
    if (path.endsWith('/letter_summary')) {
      if (!manager) return respond({ code: '42501' }, 403)
      return respond({
        total: letters.length,
        pengajuan: letters.filter((letter) => letter.status === 'pengajuan')
          .length,
        diproses: letters.filter((letter) => letter.status === 'diproses')
          .length,
        selesai: letters.filter((letter) => letter.status === 'selesai').length,
      })
    }
    if (path.endsWith('/submit_letter_request')) {
      if (options.submitFailure) {
        options.submitFailure = false
        return respond({ code: 'unavailable' }, 503)
      }
      if (options.unverified)
        return respond({ code: '22023', message: 'PROFILE_NOT_VERIFIED' }, 400)
      let letter = letters.find((letter) => letter.id === body.p_request_id)
      if (!letter) {
        const type = body.p_letter_type as keyof typeof labels
        letter = {
          id: String(body.p_request_id),
          applicant_id: currentId,
          number: letters.length + 1,
          reference: `SRT-${letters.length + 1}`,
          identity_snapshot: {
            full_name: profile.full_name,
            nik: profile.nik,
            family_card_number: profile.family_card_number!,
            address: profile.address,
            house_block: profile.house_block,
            house_number: profile.house_number,
          },
          letter_type: type,
          letter_type_label: labels[type],
          purpose: String(body.p_purpose),
          contact_phone: String(body.p_contact_phone),
          additional_notes: String(body.p_additional_notes),
          attachment: body.p_attachment as LetterRequest['attachment'],
          status: 'pengajuan',
          created_at: now(),
          updated_at: now(),
        }
        letters.push(letter)
        history.push({
          id: history.length + 1,
          request_id: letter.id,
          previous_status: null,
          status: 'pengajuan',
          actor_id: currentId,
          actor_name: profile.full_name,
          actor_role: role,
          occurred_at: letter.created_at,
        })
      }
      if (options.lostSubmitResponse) {
        options.lostSubmitResponse = false
        return respond({ code: 'unavailable' }, 503)
      }
      return respond(letter)
    }
    if (path.endsWith('/advance_letter_request')) {
      if (!manager) return respond({ code: '42501' }, 403)
      const letter = letters.find((letter) => letter.id === body.p_id)!
      if (options.staleAdvance) {
        options.staleAdvance = false
        letter.status = 'diproses'
        letter.updated_at = now()
        return respond({ code: '40001', message: 'STALE_LETTER' }, 409)
      }
      if (body.p_expected_updated_at !== letter.updated_at)
        return respond({ code: '40001', message: 'STALE_LETTER' }, 409)
      const previous = letter.status
      letter.status = body.p_status as LetterRequest['status']
      letter.updated_at = now()
      history.push({
        id: history.length + 1,
        request_id: letter.id,
        previous_status: previous,
        status: letter.status,
        actor_id: currentId,
        actor_name: profile.full_name,
        actor_role: role,
        occurred_at: letter.updated_at,
      })
      return respond(letter)
    }
    return respond({}, 404)
  })
  await page.goto('/login')
  await page.getByLabel('Email', { exact: true }).fill(profile.email)
  await page.getByLabel('Password', { exact: true }).fill('DummyPassword123!')
  await page.getByRole('button', { name: 'Masuk', exact: true }).click()
  await expect(page).toHaveURL(/\/warga$/)
  return { letters, requests, profile, options }
}
async function openForm(page: Page) {
  await page.goto('/warga/pengajuan-surat')
  await page.getByRole('link', { name: 'Ajukan Surat', exact: true }).click()
  return page.getByRole('dialog', { name: 'Form Pengajuan Surat', exact: true })
}
async function chooseType(page: Page, search = 'SKCK') {
  await page.getByRole('button', { name: /Jenis Surat/ }).click()
  const picker = page.getByRole('dialog', {
    name: 'Pilih Jenis Surat',
    exact: true,
  })
  await picker.getByLabel('Cari jenis surat', { exact: true }).fill(search)
  await picker.getByRole('radio').first().check()
  await picker.getByRole('button', { name: 'Pilih Surat', exact: true }).click()
}

test('resident submits own request, searches type picker, reads status and immutable details', async ({
  page,
}) => {
  const state = await mockLetters(page)
  const form = await openForm(page)
  await expect(
    form.getByLabel('Nama Pemohon', { exact: true }),
  ).toHaveAttribute('readonly', '')
  await page.getByRole('button', { name: /Jenis Surat/ }).click()
  const picker = page.getByRole('dialog', {
    name: 'Pilih Jenis Surat',
    exact: true,
  })
  await expect(picker.getByRole('radio')).toHaveCount(8)
  await picker.getByLabel('Cari jenis surat').fill('tidak-ada')
  await expect(picker.getByText('Jenis surat tidak ditemukan.')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(picker).not.toBeVisible()
  await expect(form.getByRole('button', { name: /Jenis Surat/ })).toBeFocused()
  await form
    .getByRole('button', { name: 'Kirim Pengajuan', exact: true })
    .click()
  await expect(
    form.getByText('Pilih jenis surat.', { exact: true }),
  ).toBeVisible()
  await chooseType(page)
  await form
    .getByLabel('Keperluan Surat', { exact: true })
    .fill('Administrasi pekerjaan dummy')
  await form
    .getByRole('button', { name: 'Kirim Pengajuan', exact: true })
    .click()
  const detail = page.getByRole('dialog', {
    name: 'Detail Pengajuan Surat',
    exact: true,
  })
  await expect(detail.getByRole('status')).toContainText(
    'Pengajuan berhasil dikirim',
  )
  await expect(
    detail.getByRole('button', { name: 'Mulai Proses', exact: true }),
  ).toHaveCount(0)
  await detail.getByText('Riwayat status', { exact: false }).click()
  await expect(
    detail.getByText('Warga Dummy 3 · Warga', { exact: true }),
  ).toBeVisible()
  const sent = state.requests.find((request) =>
    request.path.endsWith('/submit_letter_request'),
  )!.body
  expect(sent.p_attachment).toBeNull()
  expect(sent).not.toHaveProperty('applicant_id')
})

for (const role of ['ketua_rt', 'pengurus_rt'] as const)
  test(`${role} processes both transitions and sees summary, filters and personal scope`, async ({
    page,
  }) => {
    const state = await mockLetters(page, { role })
    await page.goto('/admin/pengajuan-surat')
    await expect(page.getByRole('table')).toBeVisible()
    await expect(
      page.getByRole('link', { name: 'Pengajuan Surat', exact: true }),
    ).toHaveAttribute('aria-current', 'page')
    await page.getByRole('link', { name: /Pengajuan belum diproses/ }).click()
    await expect(
      page.getByRole('heading', {
        name: 'Pengajuan Belum Diproses',
        exact: true,
      }),
    ).toBeVisible()
    await page
      .getByRole('link', { name: 'Lihat pengajuan SRT-001', exact: true })
      .click()
    const detail = page.getByRole('dialog', {
      name: 'Detail Pengajuan Surat',
      exact: true,
    })
    await detail
      .getByRole('button', { name: 'Mulai Proses', exact: true })
      .click()
    await expect(
      detail.getByRole('button', { name: 'Selesai Diproses', exact: true }),
    ).toBeEnabled()
    await detail
      .getByRole('button', { name: 'Selesai Diproses', exact: true })
      .click()
    await expect(
      detail.getByRole('button', { name: 'Tutup', exact: true }),
    ).toBeVisible()
    expect(state.letters.find((letter) => letter.id === uid(100))!.status).toBe(
      'selesai',
    )
    await detail.getByRole('button', { name: 'Tutup', exact: true }).click()
    await page
      .getByRole('link', { name: 'Semua pengajuan', exact: true })
      .click()
    await expect(
      page.getByRole('heading', { name: 'Pengajuan Surat', exact: true }),
    ).toBeVisible()
    await page.getByLabel('Jenis surat', { exact: true }).selectOption('usaha')
    await expect(
      page.getByText('dari 5 pengajuan', { exact: false }),
    ).toBeVisible()
    await page
      .getByRole('button', { name: 'Halaman berikutnya', exact: true })
      .click()
    await expect(
      page.getByText('Menampilkan 5–5 dari 5 pengajuan', { exact: true }),
    ).toBeVisible()
    await page.getByLabel('Cari pengajuan', { exact: true }).fill('tidak-ada')
    await expect(
      page.getByRole('heading', {
        name: 'Pengajuan tidak ditemukan',
        exact: true,
      }),
    ).toBeVisible()
    await page
      .getByRole('link', { name: 'Pengajuan saya', exact: true })
      .click()
    await expect(
      page.getByRole('heading', {
        name: 'Belum ada pengajuan surat',
        exact: true,
      }),
    ).toBeVisible()
  })

test('unverified residents see eligibility and cannot open manager records', async ({
  page,
}) => {
  const state = await mockLetters(page, { unverified: true })
  const form = await openForm(page)
  await expect(
    form.getByText('Pengajuan surat memerlukan profil terverifikasi.', {
      exact: false,
    }),
  ).toBeVisible()
  await expect(
    form.getByRole('button', { name: 'Kirim Pengajuan', exact: true }),
  ).toHaveCount(0)
  expect(
    state.requests.filter((request) =>
      request.path.endsWith('/submit_letter_request'),
    ),
  ).toHaveLength(0)
  await page.goto(`/warga/pengajuan-surat/${uid(101)}`)
  await expect(page.getByRole('alert')).toContainText('tidak ditemukan')
  await page.goto('/admin/pengajuan-surat')
  await expect(
    page.getByRole('heading', { name: 'Akses ditolak', exact: true }),
  ).toBeVisible()
})

test('validates attachment formats and size; retries failed upload and lost submission exactly once', async ({
  page,
}) => {
  const state = await mockLetters(page, {
    uploadFailure: true,
    lostSubmitResponse: true,
  })
  const form = await openForm(page)
  await chooseType(page)
  await form
    .getByLabel('Keperluan Surat', { exact: true })
    .fill('Keperluan dummy')
  const input = form.getByLabel('Lampiran Pendukung', { exact: true })
  await input.setInputFiles({
    name: 'script.html',
    mimeType: 'text/html',
    buffer: Buffer.from('dummy'),
  })
  await expect(
    form.getByText('Pilih berkas JPG, PNG, atau PDF.', { exact: true }),
  ).toBeVisible()
  await input.setInputFiles({
    name: 'besar.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.alloc(5242881),
  })
  await expect(
    form.getByText('Ukuran berkas harus lebih dari 0 dan maksimal 5 MB.', {
      exact: true,
    }),
  ).toBeVisible()
  await input.setInputFiles({
    name: 'dummy.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4 dummy document'),
  })
  const button = form.getByRole('button', {
    name: 'Kirim Pengajuan',
    exact: true,
  })
  await button.click()
  await expect(form.getByRole('alert')).toContainText(
    'Permintaan belum berhasil',
  )
  await expect(form.getByLabel('Keperluan Surat', { exact: true })).toHaveValue(
    'Keperluan dummy',
  )
  await button.click()
  await expect
    .poll(
      () =>
        state.requests.filter((request) =>
          request.path.endsWith('/submit_letter_request'),
        ).length,
    )
    .toBe(1)
  await expect(button).toBeEnabled()
  await button.click()
  await expect(
    page.getByRole('dialog', { name: 'Detail Pengajuan Surat', exact: true }),
  ).toBeVisible()
  const submissions = state.requests.filter((request) =>
    request.path.endsWith('/submit_letter_request'),
  )
  expect(submissions).toHaveLength(2)
  expect(submissions[0].body.p_request_id).toBe(
    submissions[1].body.p_request_id,
  )
  expect(state.letters).toHaveLength(11)
  await expect(
    page.getByRole('button', { name: 'Unduh lampiran', exact: true }),
  ).toBeVisible()
})

test('recovers a lost upload response and failed save, then downloads the private attachment', async ({
  page,
}) => {
  const state = await mockLetters(page, {
    lostUploadResponse: true,
    submitFailure: true,
  })
  const form = await openForm(page)
  await chooseType(page, 'Domisili')
  await form
    .getByLabel('Keperluan Surat', { exact: true })
    .fill('Pengujian simpan ulang')
  await form.getByLabel('Lampiran Pendukung', { exact: true }).setInputFiles({
    name: 'pendukung.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4 private dummy document'),
  })
  await form
    .getByRole('button', { name: 'Kirim Pengajuan', exact: true })
    .click()
  await expect(form.getByRole('alert')).toContainText(
    'Permintaan belum berhasil',
  )
  await expect(form.getByLabel('Keperluan Surat', { exact: true })).toHaveValue(
    'Pengujian simpan ulang',
  )
  await form
    .getByRole('button', { name: 'Kirim Pengajuan', exact: true })
    .click()
  const detail = page.getByRole('dialog', {
    name: 'Detail Pengajuan Surat',
    exact: true,
  })
  await expect(detail).toBeVisible()
  const submissions = state.requests.filter((request) =>
    request.path.endsWith('/submit_letter_request'),
  )
  expect(submissions).toHaveLength(2)
  expect(submissions[0].body.p_request_id).toBe(
    submissions[1].body.p_request_id,
  )
  expect(
    state.requests.filter(
      (request) =>
        request.path.includes('/storage/v1/object/') &&
        request.body.method === 'POST',
    ),
  ).toHaveLength(1)
  const downloaded = page.waitForEvent('download')
  await detail
    .getByRole('button', { name: 'Unduh lampiran', exact: true })
    .click()
  expect((await downloaded).suggestedFilename()).toBe('pendukung.pdf')
})

test('stale administrator mutation requires refreshing before the next transition', async ({
  page,
}) => {
  await mockLetters(page, { role: 'ketua_rt', staleAdvance: true })
  await page.goto(`/admin/pengajuan-surat/${uid(100)}`)
  const detail = page.getByRole('dialog', {
    name: 'Detail Pengajuan Surat',
    exact: true,
  })
  await detail
    .getByRole('button', { name: 'Mulai Proses', exact: true })
    .click()
  await expect(detail.getByRole('alert')).toContainText(
    'Status telah diubah pengurus lain',
  )
  await expect(
    detail.getByRole('button', { name: 'Mulai Proses', exact: true }),
  ).toBeDisabled()
  await detail
    .getByRole('button', { name: 'Muat ulang detail', exact: true })
    .click()
  await expect(
    detail.getByRole('button', { name: 'Selesai Diproses', exact: true }),
  ).toBeEnabled()
})

test('list errors can be retried and empty state has an entry to the form', async ({
  page,
}) => {
  const state = await mockLetters(page, { listFailure: true, empty: true })
  await page.goto('/warga/pengajuan-surat')
  await expect(page.getByRole('alert')).toBeVisible()
  state.options.listFailure = false
  await page
    .getByRole('button', { name: 'Coba lagi pengajuan', exact: true })
    .click()
  await expect(
    page.getByRole('heading', {
      name: 'Belum ada pengajuan surat',
      exact: true,
    }),
  ).toBeVisible()
  await page.getByRole('link', { name: 'Ajukan Surat', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
})

test('responsive screens and stacked dialogs retain focus, readable controls, and mobile navigation', async ({
  page,
}, testInfo) => {
  await mockLetters(page, { role: 'ketua_rt' })
  for (const width of [375, 768, 1280, 1648]) {
    await page.setViewportSize({ width, height: 1056 })
    await page.goto('/admin/pengajuan-surat')
    await expect(page.getByRole('table')).toBeVisible()
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true)
    await page.screenshot({
      path: testInfo.outputPath(`letters-admin-${width}.png`),
      fullPage: true,
    })
    if (width === 1648) {
      await page
        .getByRole('link', { name: 'Lihat pengajuan SRT-001', exact: true })
        .click()
      await expect(page.getByRole('dialog')).toBeVisible()
      await page.screenshot({
        path: testInfo.outputPath('letters-detail-1648.png'),
      })
    }
    await page.goto('/warga/pengajuan-surat/tambah')
    const form = page.getByRole('dialog', {
      name: 'Form Pengajuan Surat',
      exact: true,
    })
    await expect(form).toBeVisible()
    expect(
      await form.evaluate((node) => node.scrollWidth <= node.clientWidth),
    ).toBe(true)
    await page.screenshot({
      path: testInfo.outputPath(`letters-form-${width}.png`),
    })
    await page.getByRole('button', { name: /Jenis Surat/ }).click()
    const picker = page.getByRole('dialog', {
      name: 'Pilih Jenis Surat',
      exact: true,
    })
    await expect(picker).toBeVisible()
    expect(
      await picker.evaluate((node) => node.scrollWidth <= node.clientWidth),
    ).toBe(true)
    await page.screenshot({
      path: testInfo.outputPath(`letters-picker-${width}.png`),
    })
    await page.keyboard.press('Escape')
    await expect(
      form.getByRole('button', { name: /Jenis Surat/ }),
    ).toBeFocused()
  }
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/warga')
  await page
    .getByRole('button', { name: 'Buka menu navigasi', exact: true })
    .click()
  const menu = page.getByRole('dialog', { name: 'Menu navigasi', exact: true })
  await expect(menu).toBeVisible()
  await menu.getByRole('link', { name: 'Pengajuan Surat', exact: true }).click()
  await expect(menu).not.toBeVisible()
  await expect(page).toHaveURL('/admin/pengajuan-surat')
})
