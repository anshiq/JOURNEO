import { expect, test } from '@playwright/test'

test.use({ viewport: { width: 390, height: 844 } })

test('@smoke product quiz branches to the premium pick', async ({ page }) => {
  await page.goto('/play.html?fixture=template:product-quiz')
  await page.getByRole('button', { name: 'Start the quiz' }).click()
  await page.getByRole('radio', { name: 'With my team' }).click()
  await page.getByRole('radio', { name: '$25 or more' }).click()
  await expect(page.getByRole('heading', { name: 'We recommend: Plus' })).toBeVisible()
})

test('@smoke lead form validates before continuing', async ({ page }) => {
  await page.goto('/play.html?fixture=template:lead-gen-launch')
  await page.getByRole('button', { name: 'Join the waitlist' }).click()
  await page.getByRole('button', { name: 'Join the waitlist' }).click()
  await expect(page.getByText('This field is required').first()).toBeVisible()
  await page.getByRole('textbox', { name: 'First name' }).fill('Ana')
  await page.getByRole('textbox', { name: 'Email' }).fill('ana@example.com')
  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Join the waitlist' }).click()
  await expect(page.getByRole('heading', { name: "You're on the list, Ana!" })).toBeVisible()
})

test('@smoke nps detractors are routed to feedback', async ({ page }) => {
  await page.goto('/play.html?fixture=template:feedback-nps')
  await page.getByRole('radio', { name: '3 of 10' }).click()
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page.getByRole('heading', { name: /What could we do better/ })).toBeVisible()
})
