import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/preview/text-input')
  await expect(page.getByRole('heading', { name: 'Text input.' })).toBeVisible()
})

test('native focus, error priority, and disabled keyboard behavior', async ({ page }) => {
  const idle = page.getByRole('textbox', { name: 'Nama lengkap', exact: true })
  const active = page.getByRole('textbox', { name: 'Alamat email', exact: true })
  const error = page.getByRole('textbox', { name: 'Nomor HP', exact: true })
  const disabled = page.getByRole('textbox', { name: 'Wilayah tempat tinggal', exact: true })
  await expect(active).toBeFocused()
  await expect(active.locator('..')).toHaveCSS('border-color', 'rgb(8, 126, 52)')
  await page.getByText('Nama lengkap', { exact: true }).click()
  await expect(idle).toBeFocused()
  await idle.fill('Warga Contoh')
  await page.keyboard.press('Tab')
  await expect(active).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(error).toBeFocused()
  await expect(error).toHaveAttribute('aria-invalid', 'true')
  await expect(error).toHaveAccessibleDescription('Nomor HP belum lengkap. Masukkan 10–15 digit angka.')
  await expect(error.locator('..')).toHaveCSS('border-color', 'rgb(185, 28, 28)')
  await expect(disabled).toBeDisabled()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('textbox', { name: 'Email untuk dicoba' })).toBeFocused()
  await expect(idle).toHaveValue('Warga Contoh')
})

test('validation preserves helper descriptions and forwards the input ref', async ({ page }) => {
  const email = page.getByRole('textbox', { name: 'Email untuk dicoba' })
  await email.fill('belum-valid')
  await page.getByRole('button', { name: 'Periksa input' }).click()
  await expect(email).toBeFocused()
  await expect(email).toHaveValue('belum-valid')
  await expect(email).toHaveAttribute('aria-invalid', 'true')
  await expect(email).toHaveAccessibleDescription('Hanya untuk pratinjau komponen. Gunakan format nama@domain.id. Masukkan alamat email yang valid, misalnya nama@contoh.id.')
  const errorId = await email.getAttribute('aria-errormessage')
  expect(errorId).toBeTruthy()
  await expect(page.locator(`[id="${errorId}"]`)).toContainText('Masukkan alamat email yang valid')
  await email.fill('warga@contoh.id')
  await expect(email).not.toHaveAttribute('aria-invalid', 'true')
  await expect(email).toHaveAccessibleDescription('Hanya untuk pratinjau komponen. Gunakan format nama@domain.id.')
  await page.getByRole('button', { name: 'Periksa input' }).click()
  await expect(page.getByRole('status')).toHaveText('Format email sudah benar.')
  const ids = await page.locator('input').evaluateAll(inputs => inputs.map(input => input.id))
  expect(new Set(ids).size).toBe(ids.length)
})

test('password visibility and inherited fieldset disabling keep native semantics', async ({ page }) => {
  const password = page.getByLabel('Password untuk dicoba', { exact: true })
  await password.fill('Contoh123!')
  const toggle = password.locator('..').getByRole('button')
  await toggle.click()
  await expect(password).toHaveAttribute('type', 'text')
  await expect(toggle).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Sembunyikan password untuk dicoba' }).click()
  await expect(password).toHaveAttribute('type', 'password')
  await expect(password).toHaveValue('Contoh123!')
  // Exercise a pending form disabling all its controls, as the resident editor does.
  await page.locator('form').evaluate(form => {
    const fieldset = document.createElement('fieldset')
    fieldset.disabled = true
    form.before(fieldset)
    fieldset.append(form)
  })
  await expect(password).toBeDisabled()
  await expect(toggle).toBeDisabled()
  await expect(password.locator('..')).toHaveCSS('background-color', 'rgb(241, 245, 249)')
})

for (const width of [320, 360, 768, 1280, 1440]) {
  test(`layout and RTL mirror fit ${width}px with long labels`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 })
    await page.evaluate(() => document.fonts.ready)
    for (const direction of ['ltr', 'rtl']) {
      await page.evaluate(dir => { document.documentElement.dir = dir }, direction)
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
      const email = page.getByRole('textbox', { name: 'Alamat email', exact: true })
      const inputBounds = await email.boundingBox()
      const iconBounds = await email.locator('..').locator('svg').boundingBox()
      expect(inputBounds?.width).toBeGreaterThan(100)
      if (direction === 'ltr') expect(iconBounds!.x).toBeLessThan(inputBounds!.x)
      else expect(iconBounds!.x).toBeGreaterThan(inputBounds!.x)
      await page.screenshot({ path: `test-results/text-input-${width}-${direction}.png`, fullPage: true })
    }
    await page.evaluate(() => {
      document.documentElement.dir = 'ltr'
      document.querySelector('label')!.textContent = '[!! Vollständiger Name der antragstellenden Einwohnerin oder des antragstellenden Einwohners !!]'
      document.querySelector('input')!.setAttribute('placeholder', 'Bitte geben Sie Ihren vollständigen amtlichen Namen ein')
    })
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
    // Doubling the root text size checks reflow and text growth at every width.
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%' })
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
    await page.getByRole('button', { name: 'Periksa input' }).scrollIntoViewIfNeeded()
    await expect(page.getByRole('button', { name: 'Periksa input' })).toBeInViewport()
  })
}

test('reduced motion and forced colors retain error and focus cues', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce', forcedColors: 'active' })
  const error = page.getByRole('textbox', { name: 'Nomor HP', exact: true })
  await error.focus()
  await expect(error.locator('..')).toHaveCSS('border-style', 'dashed')
  await expect(error.locator('..')).toHaveCSS('outline-style', 'solid')
  await expect(error).toHaveAccessibleDescription('Nomor HP belum lengkap. Masukkan 10–15 digit angka.')
  const toggle = page.getByRole('button', { name: 'Tampilkan password untuk dicoba' })
  await expect(toggle.locator('svg').first()).toHaveCSS('transition-duration', '0.15s')
  await toggle.scrollIntoViewIfNeeded()
  const bounds = await toggle.boundingBox()
  await page.mouse.move(bounds!.x + bounds!.width / 2, bounds!.y + bounds!.height / 2)
  await page.mouse.down()
  await expect(toggle).toHaveCSS('scale', 'none')
  await page.mouse.up()
})
