import { expect, type Page, test } from '@playwright/test'

const API = process.env.API_URL

function watchErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(`pageerror: ${error.message}`))
  page.on('console', message => {
    if (message.type() === 'error' && !message.text().includes('Failed to load resource')) errors.push(message.text())
  })
  return errors
}

test.describe('@editor creator workspace', () => {
  test.skip(!API, 'API_URL not set')
  test.use({ viewport: { width: 1440, height: 900 } })

  test('create from a template, edit, branch, publish and open the link', async ({ page }) => {
    const errors = watchErrors(page)
    await page.goto('/campaigns')
    await page.getByRole('button', { name: 'New campaign' }).click()
    await page.getByRole('radio', { name: 'Collect leads' }).click()
    await page.getByRole('textbox', { name: 'What are you promoting?' }).fill('Summer candle sale')
    await page.getByRole('radio', { name: /Launch waitlist/ }).click()
    await page.getByRole('button', { name: 'Use this template' }).click()
    await expect(page).toHaveURL(/\/campaigns\/[^/]+$/)
    await expect(page.getByRole('navigation', { name: 'Screens' })).toBeVisible()
    await page.getByRole('button', { name: 'Skip tips' }).click()

    const canvas = page.getByRole('main', { name: 'Canvas' })
    const heading = canvas.locator('[data-element-type="heading"]').first()
    await heading.click()
    const editor = canvas.getByRole('textbox', { name: 'Edit text' })
    await expect(editor).toBeVisible()
    await editor.press('ControlOrMeta+a')
    await editor.pressSequentially('Light up your summer')
    await page.getByRole('complementary', { name: 'Inspector' }).click({ position: { x: 10, y: 400 } })
    await expect(canvas.getByRole('heading', { name: 'Light up your summer' })).toBeVisible()
    await expect(page.getByRole('status').filter({ hasText: 'Saved' })).toBeVisible({ timeout: 10_000 })

    await page.getByRole('button', { name: 'Undo' }).click()
    await expect(canvas.getByRole('heading', { name: 'Light up your summer' })).toHaveCount(0)
    await page.getByRole('button', { name: 'Redo' }).click()
    await expect(canvas.getByRole('heading', { name: 'Light up your summer' })).toBeVisible()

    await page.getByRole('button', { name: 'Add screen' }).click()
    await page.getByRole('button', { name: 'Question', exact: true }).click()
    const inspector = page.getByRole('complementary', { name: 'Inspector' })
    await expect(inspector.getByText('Screen', { exact: true })).toBeVisible()
    await canvas.locator('[data-element-type="choice"]').first().click()
    await inspector.getByRole('tab', { name: 'Logic' }).click()
    await inspector.getByRole('switch', { name: /Send each answer to a different screen/ }).click()
    await expect(inspector.getByText('Where each answer goes')).toBeVisible()

    await page.getByRole('radio', { name: 'Flow' }).click()
    await expect(page.getByTestId('flow').locator('.react-flow__node').first()).toBeVisible()
    await page.getByRole('radio', { name: 'Screen' }).click()

    await page.getByRole('button', { name: 'Desktop' }).click()
    await expect(canvas.locator('[data-device="desktop"]')).toBeVisible()
    await page.getByRole('button', { name: 'Mobile' }).click()

    await page.getByRole('navigation', { name: 'Screens' }).getByRole('button', { name: 'Light up your summer', exact: true }).click()
    await page.getByRole('banner').getByRole('button', { name: 'Play', exact: true }).click()
    const frame = page.frameLocator('iframe[title="Journey preview"]')
    await expect(frame.getByRole('heading', { name: 'Light up your summer' })).toBeVisible()
    await page.getByRole('dialog', { name: 'Play your journey' }).getByRole('button', { name: 'Close' }).click()

    await page.getByRole('button', { name: /^Publish/ }).click()
    const publish = page.getByRole('dialog', { name: 'Publish' })
    await expect(publish.getByRole('button', { name: /Publish/ }).last()).toBeEnabled({ timeout: 10_000 })
    await publish.getByRole('button', { name: /Publish/ }).last().click()
    await expect(page.getByRole('dialog', { name: 'Your campaign is live' })).toBeVisible()
    const link = await page.getByRole('dialog', { name: 'Your campaign is live' }).locator('p.font-mono').textContent()
    await page.getByRole('button', { name: 'Done' }).click()

    await page.goto(new URL(link ?? '').pathname)
    await expect(page.getByRole('heading', { name: 'Light up your summer' })).toBeVisible()
    expect(errors).toEqual([])
  })
})
