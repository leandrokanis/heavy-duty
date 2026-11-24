import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'
import { callMcpTool } from './catalog-api.js'
import { test, windowsResponseOf } from './group-window-fixtures.js'

const { When, Then } = createBdd(test)

const DAY_MS = 24 * 60 * 60 * 1000

When(
  'the planner sets the weekly goal of {int} windows through MCP',
  async ({ request, groupWindow }, weeklyGoal: number) => {
    groupWindow.response = await callMcpTool(request, 'set_weekly_goal', { weeklyGoal })
  },
)

// The API runs with the real clock, so the week starts a day before now and holds the new goal.
Then(
  'the planner should see the weekly goal of {int} in the week of now through MCP',
  async ({ request, groupWindow }, weeklyGoal: number) => {
    const set = (await windowsResponseOf(groupWindow).json()) as { result?: { isError?: boolean } }
    expect(set.result?.isError).toBeFalsy()
    const fromMs = Date.now() - DAY_MS
    const response = await callMcpTool(request, 'get_windows_used', {
      from: new Date(fromMs).toISOString(),
      to: new Date(fromMs + 7 * DAY_MS).toISOString(),
    })
    const body = (await response.json()) as {
      result?: { structuredContent?: { weeks: { weeklyGoal: number | null }[] } }
    }

    expect(body.result?.structuredContent?.weeks[0]?.weeklyGoal).toBe(weeklyGoal)
  },
)
