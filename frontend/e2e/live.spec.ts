import { expect, test } from '@playwright/test'

const API = process.env.API_URL

test.describe('@live published campaign', () => {
  test.skip(!API, 'API_URL not set')
  test.use({ viewport: { width: 390, height: 844 } })

  test('visitor completes the lead form on the real link', async ({ page, request, baseURL }) => {
    const created = await request.post(`${API}/api/v1/campaigns`, {
      data: { name: 'Live smoke', start: { mode: 'template', templateId: 'lead-gen-launch' } },
    })
    expect(created.status()).toBe(201)
    const { campaign } = (await created.json()) as { campaign: { id: string; slug: string } }
    const workspace = (await (await request.get(`${API}/api/v1/campaigns/${campaign.id}/journey`)).json()) as {
      draft: { revision: number }
    }
    const published = await request.post(`${API}/api/v1/campaigns/${campaign.id}/journey/publish`, {
      data: { revision: workspace.draft.revision },
    })
    expect(published.ok()).toBe(true)

    const html = await (await request.get(`${baseURL}/c/${campaign.slug}`)).text()
    expect(html).toContain('<meta property="og:title" content="Join the summer waitlist">')
    expect(html).toContain('<script id="jx-doc" type="application/json">{')

    await page.goto(`/c/${campaign.slug}?utm_source=e2e`)
    await page.getByRole('button', { name: 'Join the waitlist' }).click()
    await page.getByRole('textbox', { name: 'First name' }).fill('Erin')
    await page.getByRole('textbox', { name: 'Email' }).fill('erin@example.com')
    await page.getByRole('checkbox').check()
    await page.getByRole('button', { name: 'Join the waitlist' }).click()
    await expect(page.getByRole('heading', { name: "You're on the list, Erin!" })).toBeVisible()

    await expect
      .poll(async () => {
        const leads = (await (await request.get(`${API}/api/v1/campaigns/${campaign.id}/leads`)).json()) as {
          items: { answers: Record<string, unknown>; utm: Record<string, string> }[]
        }
        return leads.items.map(item => [item.answers.email, item.utm.utm_source])
      })
      .toEqual([['erin@example.com', 'e2e']])
    await expect
      .poll(
        async () => {
          const results = (await (await request.get(`${API}/api/v1/campaigns/${campaign.id}/results?range=all`)).json()) as {
            sessions: number
            funnel: { visitors: number }[]
          }
          return [results.sessions, results.funnel.filter(step => step.visitors > 0).length]
        },
        { timeout: 15_000 },
      )
      .toEqual([1, 3])
  })
})
