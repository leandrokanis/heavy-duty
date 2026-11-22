import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'
import { callMcpTool } from './catalog-api.js'
import { responseOf, test } from './edit-remove-workout-fixtures.js'

const { When, Then } = createBdd(test)

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

type ToolBody = {
  result?: {
    isError?: boolean
    content?: { text: string }[]
    structuredContent?: {
      applied?: boolean
      confirmationCode?: string | null
      workouts?: { id: string }[]
    }
  }
}

// The week starts at the given instant and ends seven days later, as in list_workouts.
function weekOf(from: string): { from: string; to: string } {
  return { from, to: new Date(Date.parse(from) + WEEK_MS).toISOString() }
}

When(
  'the planner asks to remove the workout of the week of {string} through MCP',
  async ({ request, editRemove }, from: string) => {
    const listed = (await (
      await callMcpTool(request, 'list_workouts', weekOf(from))
    ).json()) as ToolBody
    editRemove.workoutId = listed.result?.structuredContent?.workouts?.[0]?.id
    editRemove.preview = await callMcpTool(request, 'remove_workout', {
      workoutId: editRemove.workoutId,
    })
  },
)

Then('the removal should be a preview that is not applied', async ({ editRemove }) => {
  const body = (await responseOf(editRemove.preview, 'the removal request').json()) as ToolBody
  expect({
    applied: body.result?.structuredContent?.applied,
    hasCode: Boolean(body.result?.structuredContent?.confirmationCode),
  }).toEqual({ applied: false, hasCode: true })
})

Then(
  'the week of {string} should still have {int} workout',
  async ({ request }, from: string, count: number) => {
    await expectWorkoutCount(request, from, count)
  },
)

When(
  'the planner confirms the removal with the code of the preview through MCP',
  async ({ request, editRemove }) => {
    const preview = (await responseOf(editRemove.preview, 'the removal request').json()) as ToolBody
    editRemove.confirmation = await callMcpTool(request, 'remove_workout', {
      workoutId: editRemove.workoutId,
      confirmationCode: preview.result?.structuredContent?.confirmationCode,
    })
  },
)

Then('the removal should be applied', async ({ editRemove }) => {
  const body = (await responseOf(editRemove.confirmation, 'the confirmation').json()) as ToolBody
  expect({
    applied: body.result?.structuredContent?.applied,
    code: body.result?.structuredContent?.confirmationCode,
  }).toEqual({ applied: true, code: null })
})

Then(
  'the week of {string} should have {int} workouts',
  async ({ request }, from: string, count: number) => {
    await expectWorkoutCount(request, from, count)
  },
)

When(
  'the planner asks to edit a workout that does not exist through MCP',
  async ({ request, editRemove }) => {
    editRemove.refusal = await callMcpTool(request, 'update_workout_set', {
      workoutId: '0193a1b2-0000-7000-8000-00000000ffff',
      setId: '0193a1b2-0000-7000-8000-00000000fffe',
      loadG: 42500,
      reps: 8,
    })
  },
)

Then(
  'the edit should be refused with the reason {string}',
  async ({ editRemove }, message: string) => {
    const body = (await responseOf(editRemove.refusal, 'the edit request').json()) as ToolBody
    expect({
      isError: body.result?.isError,
      message: JSON.parse(body.result?.content?.[0]?.text ?? 'null')?.message,
    }).toEqual({ isError: true, message })
  },
)

async function expectWorkoutCount(
  request: Parameters<typeof callMcpTool>[0],
  from: string,
  count: number,
): Promise<void> {
  const listed = (await (
    await callMcpTool(request, 'list_workouts', weekOf(from))
  ).json()) as ToolBody
  expect(listed.result?.structuredContent?.workouts).toHaveLength(count)
}
