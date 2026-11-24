import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'
import { callMcpTool } from './catalog-api.js'
import { type GroupWindowState, test, windowsResponseOf } from './group-window-fixtures.js'

const { When, Then } = createBdd(test)

type WeekWindows = {
  from: string
  windowsUsed: number
  windowsMissed: number
  usedPercent: number | null
}

When(
  'the planner gets the windows used from {string} to {string} through MCP',
  async ({ request, groupWindow }, from: string, to: string) => {
    groupWindow.response = await callMcpTool(request, 'get_windows_used', { from, to })
  },
)

async function weekOf(state: GroupWindowState, from: string) {
  const body = (await windowsResponseOf(state).json()) as {
    result?: { isError?: boolean; structuredContent?: { weeks: WeekWindows[] } }
  }
  expect(body.result?.isError).toBeFalsy()
  const week = body.result?.structuredContent?.weeks.find((row) => row.from === from)
  expect(week).toBeDefined()
  return week as WeekWindows
}

Then(
  'the week from {string} should show {int} of {int} windows used, or {int}%',
  async ({ groupWindow }, from: string, used: number, finished: number, percent: number) => {
    const week = await weekOf(groupWindow, from)

    expect([week.windowsUsed, week.windowsUsed + week.windowsMissed, week.usedPercent]).toEqual([
      used,
      finished,
      percent,
    ])
  },
)

Then(
  'the week from {string} should show {int} of {int} windows used, with no percent',
  async ({ groupWindow }, from: string, used: number, finished: number) => {
    const week = await weekOf(groupWindow, from)

    expect([week.windowsUsed, week.windowsUsed + week.windowsMissed, week.usedPercent]).toEqual([
      used,
      finished,
      null,
    ])
  },
)
