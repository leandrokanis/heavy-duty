import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'
import { test, windowsResponseOf } from './group-window-fixtures.js'

const { Then } = createBdd(test)

type GroupLevel = {
  muscleGroup: { slug: string }
  level: number
  bestLevel: number
  muscleMemory: boolean
}

Then(
  'the group {string} should be at level {int} with best level {int} and muscle memory',
  async ({ groupWindow }, slug: string, level: number, bestLevel: number) => {
    const body = (await windowsResponseOf(groupWindow).json()) as {
      result?: { structuredContent?: { groups: GroupLevel[] } }
    }
    const group = body.result?.structuredContent?.groups.find(
      (row) => row.muscleGroup.slug === slug,
    )

    expect(group && [group.level, group.bestLevel, group.muscleMemory]).toEqual([
      level,
      bestLevel,
      true,
    ])
  },
)
