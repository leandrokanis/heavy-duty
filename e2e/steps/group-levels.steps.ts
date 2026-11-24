import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'
import { callMcpTool } from './catalog-api.js'
import { test, windowsResponseOf } from './group-window-fixtures.js'

const { When, Then } = createBdd(test)

type GroupLevel = {
  muscleGroup: { slug: string }
  level: number
  points: number
  levelCost: number
  tier: string
}

When('the planner lists the muscle group levels through MCP', async ({ request, groupWindow }) => {
  groupWindow.response = await callMcpTool(request, 'list_muscle_group_levels', {})
})

Then(
  'the group {string} should be at level {int} with {int} of {int} points, tier {string}',
  async (
    { groupWindow },
    slug: string,
    level: number,
    points: number,
    levelCost: number,
    tier: string,
  ) => {
    const body = (await windowsResponseOf(groupWindow).json()) as {
      result?: { isError?: boolean; structuredContent?: { groups: GroupLevel[] } }
    }
    expect(body.result?.isError).toBeFalsy()
    const group = body.result?.structuredContent?.groups.find(
      (row) => row.muscleGroup.slug === slug,
    )

    expect(group && [group.level, group.points, group.levelCost, group.tier]).toEqual([
      level,
      points,
      levelCost,
      tier,
    ])
  },
)
