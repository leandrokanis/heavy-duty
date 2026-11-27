import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'
import { callMcpTool } from './catalog-api.js'
import { test } from './group-window-fixtures.js'
import { firstSetOfEarliestWorkout } from './period-fixtures.js'

const { Given, When, Then } = createBdd(test)

type Snapshot = Record<string, unknown>
type ToolBody = {
  result?: {
    isError?: boolean
    structuredContent?: {
      periods?: { number: number; snapshot: Snapshot | null }[]
      confirmationCode?: string | null
      applied?: boolean
    }
  }
}

async function snapshotOfPeriod1(request: Parameters<typeof callMcpTool>[0]): Promise<Snapshot> {
  const body = (await (await callMcpTool(request, 'list_periods', {})).json()) as ToolBody
  const snapshot = body.result?.structuredContent?.periods?.find(
    ({ number }) => number === 1,
  )?.snapshot
  expect(snapshot).toBeTruthy()
  return snapshot as Snapshot
}

let snapshotBefore: Snapshot | null = null

Then(
  'the snapshots of {string} and {string} should show side by side',
  async ({ page }, first: string, second: string) => {
    const snapshots = page.getByRole('list', { name: 'Retratos' })
    const left = snapshots.getByRole('article', { name: first })
    const right = snapshots.getByRole('article', { name: second })
    await expect(left).toBeVisible()
    await expect(right).toBeVisible()
    const [leftBox, rightBox] = await Promise.all([left.boundingBox(), right.boundingBox()])
    expect(leftBox && rightBox && Math.abs(leftBox.y - rightBox.y) < 1).toBe(true)
    expect(leftBox && rightBox && leftBox.x + leftBox.width <= rightBox.x).toBe(true)
  },
)

Given('the planner reads the snapshot of period 1 through MCP', async ({ request }) => {
  snapshotBefore = await snapshotOfPeriod1(request)
})

When(
  'the planner changes the first set of period 1 to {int} kg through MCP, with the confirmation',
  async ({ request }, kg: number) => {
    const edit = { ...firstSetOfEarliestWorkout(), loadG: kg * 1000, reps: 10 }
    const preview = (await (
      await callMcpTool(request, 'update_workout_set', edit)
    ).json()) as ToolBody
    const confirmationCode = preview.result?.structuredContent?.confirmationCode
    expect(confirmationCode).toBeTruthy()
    const applied = (await (
      await callMcpTool(request, 'update_workout_set', { ...edit, confirmationCode })
    ).json()) as ToolBody
    expect(applied.result?.structuredContent?.applied).toBe(true)
  },
)

Then('the snapshot of period 1 should be the same through MCP', async ({ request }) => {
  expect(await snapshotOfPeriod1(request)).toEqual(snapshotBefore)
})
