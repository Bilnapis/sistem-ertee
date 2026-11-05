import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/preview/button')
  await expect(
    page.getByRole('heading', { name: 'Button', exact: true }),
  ).toBeVisible()
})

test('buttons preserve native submit, refs, keyboard activation, and fieldset disabling', async ({
  page,
}) => {
  const action = page.getByRole('button', { name: 'Aksi contoh', exact: true })
  await page.getByRole('button', { name: 'Fokuskan aksi' }).click()
  await expect(action).toBeFocused()
  await page.keyboard.press('Space')
  await expect(page.getByLabel('Jumlah aksi')).toHaveText('1')
  await expect(page.getByLabel('Jumlah submit')).toHaveText('0')
  await page.getByRole('button', { name: 'Simpan contoh' }).click()
  await expect(page.getByLabel('Jumlah submit')).toHaveText('1')
  await expect(
    page.getByRole('button', { name: 'Dinonaktifkan oleh formulir' }),
  ).toBeDisabled()
})

test('disabled links block activation and are skipped with disabled buttons by Tab', async ({
  page,
}) => {
  const disabledLink = page.getByRole('link', { name: 'Tautan nonaktif' })
  await expect(disabledLink).toHaveAttribute('aria-disabled', 'true')
  const originalUrl = page.url()
  const cancelled = await disabledLink.evaluate((node: HTMLAnchorElement) => {
    node.click()
    return !node.dispatchEvent(
      new MouseEvent('auxclick', {
        bubbles: true,
        cancelable: true,
        button: 1,
      }),
    )
  })
  expect(cancelled).toBe(true)
  await expect(page).toHaveURL(originalUrl)
  await expect(page.getByLabel('Jumlah navigasi')).toHaveText('0')
  await page.getByRole('button', { name: 'Simpan contoh' }).focus()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'Buka contoh' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/#button-preview-target$/)
})

for (const width of [375, 1280]) {
  test(`icons, long labels, RTL, and enlarged text fit ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 })
    const button = page.getByRole('button', { name: 'Simpan dan lanjutkan' })
    for (const dir of ['ltr', 'rtl']) {
      for (const fontSize of ['100%', '200%']) {
        await page.evaluate(
          ({ dir, fontSize }) => {
            document.documentElement.dir = dir
            document.documentElement.style.fontSize = fontSize
          },
          { dir, fontSize },
        )
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth),
        ).toBeLessThanOrEqual(width)
        const spans = button.locator(':scope > span')
        const first = (await spans.first().boundingBox())!
        const label = (await spans.nth(1).boundingBox())!
        const last = (await spans.last().boundingBox())!
        expect(
          dir === 'ltr'
            ? first.x < label.x && label.x < last.x
            : first.x > label.x && label.x > last.x,
        ).toBe(true)
        await expect(button).toHaveAccessibleName('Simpan dan lanjutkan')
        const icon = page.getByRole('button', { name: 'Muat ulang contoh' })
        const box = (await icon.boundingBox())!
        expect(box.width).toBeGreaterThanOrEqual(44)
        expect(box.height).toBeGreaterThanOrEqual(44)
        if (dir === 'ltr' && fontSize === '100%')
          await page.screenshot({
            path: testInfo.outputPath(`button-${width}.png`),
            fullPage: true,
          })
      }
    }
  })
}
