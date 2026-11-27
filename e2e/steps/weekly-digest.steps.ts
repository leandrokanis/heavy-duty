import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'
import { callMcpTool } from './catalog-api.js'
import { test } from './group-window-fixtures.js'

const { Given, When, Then } = createBdd(test)

type WeeklyDigest = {
  ended: boolean
  subject: string
  windowsUsed: number
  records: string[]
  medals: string[]
}

const digests = new WeakMap<object, WeeklyDigest>()

// The game scheduler records the medals once a minute; list_medals records them at once.
Given('the medals of the history are recorded', async ({ request }) => {
  expect((await callMcpTool(request, 'list_medals', {})).status()).toBe(200)
})

// The period started 8 days ago, so its week 1 ended a day ago: with no at, the digest shows it.
When(
  'the week ends and the planner reads the weekly digest through MCP',
  async ({ request, groupWindow }) => {
    const body = (await (await callMcpTool(request, 'get_weekly_digest', {})).json()) as {
      result?: { structuredContent?: WeeklyDigest }
    }
    expect(body.result?.structuredContent).toBeDefined()
    digests.set(groupWindow, body.result?.structuredContent as WeeklyDigest)
  },
)

// The catalog and the weekly goals of earlier features stay in the database, so the check reads
// the windows and the medals this history yields, not their exact totals.
Then(
  'the digest of the week that ended should show the windows used, the record of {string} and the medals {string} and {string}',
  async ({ groupWindow }, exercise: string, first: string, second: string) => {
    const digest = digests.get(groupWindow) as WeeklyDigest
    expect({
      ended: digest.ended,
      subject: digest.subject.startsWith('Sua semana: '),
      windowsUsed: digest.windowsUsed >= 1,
      records: digest.records,
      medals: digest.medals,
    }).toEqual({
      ended: true,
      subject: true,
      windowsUsed: true,
      records: [exercise],
      medals: expect.arrayContaining([first, second]),
    })
  },
)
