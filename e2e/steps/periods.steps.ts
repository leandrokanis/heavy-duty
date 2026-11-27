import { expect, type Page } from '@playwright/test'
import { createBdd } from 'playwright-bdd'
import { callMcpTool } from './catalog-api.js'
import { test } from './group-window-fixtures.js'

const { When, Then } = createBdd(test)

const WEEK_MS = 7 * 24 * 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000

type Period = { number: number; startsAt: string; endsAt: string; intention: string | null }

function tabBar(page: Page) {
  return page.getByRole('navigation', { name: 'Seções' })
}

async function periodThroughMcp(request: Parameters<typeof callMcpTool>[0]): Promise<Period> {
  const body = (await (await callMcpTool(request, 'get_period', {})).json()) as {
    result?: { structuredContent?: Period }
  }
  expect(body.result?.structuredContent).toBeDefined()
  return body.result?.structuredContent as Period
}

When('the athlete opens the period from the tab bar', async ({ page }) => {
  await page.goto('/')
  await tabBar(page).getByRole('link', { name: 'Período' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Período' })).toBeVisible()
})

When('the athlete taps {string} on the tab bar', async ({ page }, name: string) => {
  await tabBar(page).getByRole('link', { name }).click()
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible()
})

// The API opened period 1 at its start, on the Monday of the week of the run.
Then(
  'the period should show its start, its end 12 weeks later and the week of now',
  async ({ page, request }) => {
    const period = await periodThroughMcp(request)
    const startsAtMs = Date.parse(period.startsAt)
    const lastDayMs = Date.parse(period.endsAt) - DAY_MS
    const days = await page.evaluate(
      ([first, last]) => {
        const format = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short' })
        return `De ${format.format(first)} a ${format.format(last)}`
      },
      [startsAtMs, lastDayMs],
    )
    const week = Math.min(12, Math.floor((Date.now() - startsAtMs) / WEEK_MS) + 1)
    const card = page.getByRole('region', { name: 'Semana do período' })

    expect(Date.parse(period.endsAt) - startsAtMs).toBe(12 * WEEK_MS)
    await expect(page.getByText(`Período ${period.number} · 12 semanas`)).toBeVisible()
    await expect(card.getByText(`Semana ${week} de 12`)).toBeVisible()
    await expect(card.getByText(days)).toBeVisible()
  },
)

When('the athlete writes the intention {string}', async ({ page }, intention: string) => {
  await page.getByRole('button', { name: /^(Escrever|Editar) a frase$/ }).click()
  await page.getByRole('textbox', { name: 'Frase de intenção' }).fill(intention)
  await page.getByRole('button', { name: 'Salvar' }).click()
  await expect(page.getByRole('dialog', { name: 'Frase de intenção' })).toBeHidden()
})

Then('the period should show the intention {string}', async ({ page }, intention: string) => {
  await expect(
    page.getByRole('region', { name: 'Semana do período' }).getByText(`“${intention}”`),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'Editar a frase' })).toBeVisible()
})

Then(
  'the planner should read the intention {string} through MCP',
  async ({ request }, intention: string) => {
    expect((await periodThroughMcp(request)).intention).toBe(intention)
  },
)

Then(
  'the tab bar should show {string}, {string} and {string} with {string} as the current section',
  async ({ page }, first: string, second: string, third: string, current: string) => {
    const links = tabBar(page).getByRole('link')
    await expect(links).toHaveText([first, second, third])
    await expect(tabBar(page).getByRole('link', { name: current })).toHaveAttribute(
      'aria-current',
      'page',
    )
    for (const box of await Promise.all((await links.all()).map((link) => link.boundingBox()))) {
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44)
    }
  },
)

Then('the tab bar should mark {string} as the current section', async ({ page }, name: string) => {
  await expect(tabBar(page).getByRole('link', { name })).toHaveAttribute('aria-current', 'page')
})
