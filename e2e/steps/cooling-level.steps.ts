import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'
import { callMcpTool } from './catalog-api.js'
import { test, windowsResponseOf } from './group-window-fixtures.js'

const { Then } = createBdd(test)

type GroupLevel = {
  muscleGroup: { slug: string }
  level: number
  points: number
  bestLevel: number
  cooling: boolean
  nextDropAt: string | null
}

async function levelOf(body: unknown, slug: string): Promise<GroupLevel> {
  const result = (body as { result?: { structuredContent?: { groups: GroupLevel[] } } }).result
  const group = result?.structuredContent?.groups.find((row) => row.muscleGroup.slug === slug)
  expect(group).toBeDefined()
  return group as GroupLevel
}

Then(
  'the day {string} should show {string} cooling at level {int} with the bar at {int} %',
  async ({ page }, letter: string, group: string, level: number, percent: number) => {
    const row = page.getByRole('button', { name: new RegExp(`^${letter}(\\s|$)`) })
    const item = row.getByRole('listitem').filter({ hasText: group })
    await expect(item).toHaveText(new RegExp(`^${group} · esfriando .*, nível ${level}`))
    await expect(item.locator('[data-tier]')).toHaveAttribute('data-cold', '')
    const bar = item.locator('[data-level-bar]')
    await expect(bar).toHaveAttribute('data-cooling', '')
    expect(await bar.evaluate((element) => element.style.getPropertyValue('--level-fill'))).toBe(
      `${percent}%`,
    )
  },
)

Then(
  'the group {string} should be cooling at level {int}, with best level {int} and a next drop',
  async ({ groupWindow }, slug: string, level: number, bestLevel: number) => {
    const group = await levelOf(await windowsResponseOf(groupWindow).json(), slug)

    expect([group.cooling, group.level, group.bestLevel]).toEqual([true, level, bestLevel])
    expect(Date.parse(group.nextDropAt ?? '')).toBeGreaterThan(Date.now())
  },
)

Then(
  'the group {string} should be cooling at level {int} with {int} points and no next drop',
  async ({ groupWindow }, slug: string, level: number, points: number) => {
    const group = await levelOf(await windowsResponseOf(groupWindow).json(), slug)

    expect([group.cooling, group.level, group.points, group.nextDropAt]).toEqual([
      true,
      level,
      points,
      null,
    ])
  },
)

Then(
  'the group {string} should stop cooling once the set reaches the API',
  async ({ request }, slug: string) => {
    await expect
      .poll(async () => {
        const response = await callMcpTool(request, 'list_muscle_group_levels', {})
        return (await levelOf(await response.json(), slug)).cooling
      })
      .toBe(false)
  },
)
