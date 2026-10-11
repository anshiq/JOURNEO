import AxeBuilder from '@axe-core/playwright'
import { expect, type Page, test } from '@playwright/test'
import { RECIPES, TEMPLATES, VIEWPORTS } from './viewports'

async function audit(page: Page, mobile: boolean) {
  const report = await page.evaluate(isMobile => {
    const doc = document.documentElement
    const overflow = doc.scrollWidth - doc.clientWidth
    const taps = [...document.querySelectorAll<HTMLElement>('[data-jx-tap]')]
      .filter(el => el.offsetParent !== null)
      .map(el => {
        const box = el.getBoundingClientRect()
        return { text: el.textContent?.trim().slice(0, 30), width: box.width, height: box.height }
      })
      .filter(box => box.width < 43.5 || box.height < 43.5)
    const smallInputs = isMobile
      ? [...document.querySelectorAll<HTMLElement>('input:not([type=checkbox]):not([tabindex="-1"]), select, textarea')]
          .filter(el => el.offsetParent !== null)
          .filter(el => Number.parseFloat(getComputedStyle(el).fontSize) < 16)
          .map(el => el.getAttribute('aria-label') ?? el.id)
      : []
    const clipped = [...document.querySelectorAll<HTMLElement>('[data-jx-text]')]
      .filter(el => el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).overflowX === 'hidden')
      .map(el => el.textContent?.slice(0, 30))
    const primary = document.querySelector<HTMLElement>('[data-jx-tap], button[type=submit]')
    return { overflow, taps, smallInputs, clipped, hasPrimary: primary !== null }
  }, mobile)
  expect(report.overflow, 'horizontal overflow').toBeLessThanOrEqual(1)
  expect(report.taps, 'tap targets under 44px').toEqual([])
  expect(report.smallInputs, 'mobile inputs under 16px').toEqual([])
  expect(report.clipped, 'clipped text').toEqual([])
  const axe = await new AxeBuilder({ page }).include('#jx-player').disableRules(['region']).analyze()
  const serious = axe.violations.filter(v => v.impact === 'serious' || v.impact === 'critical')
  expect(serious.map(v => `${v.id}: ${v.nodes.map(n => n.target.join(' ')).join(', ')}`)).toEqual([])
}

for (const viewport of VIEWPORTS) {
  test.describe(`@responsive ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } })
    for (const name of TEMPLATES) {
      test(`template ${name}`, async ({ page }) => {
        await page.goto(`/play.html?fixture=template:${name}`)
        await page.locator('[data-screen-id]').waitFor()
        await audit(page, viewport.width < 640)
      })
    }
    for (const name of RECIPES) {
      test(`recipe ${name}`, async ({ page }) => {
        await page.goto(`/play.html?fixture=recipe:${name}`)
        await page.locator('[data-screen-id]').waitFor()
        await audit(page, viewport.width < 640)
      })
    }
  })
}
