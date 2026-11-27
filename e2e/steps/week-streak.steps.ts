import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'
import { test } from './group-window-fixtures.js'
import {
  mondayOfThisWeekMs,
  setOnlyWeeklyGoal,
  startFirstPeriodWeeksAgo,
  WEEK_MS,
} from './period-fixtures.js'
import { programIdOf } from './program-fixtures.js'
import { toExerciseSlug, toLoadG } from './program-helpers.js'
import { recordWorkout } from './workout-fixtures.js'

const { Given, Then } = createBdd(test)

const HOUR_MS = 60 * 60 * 1000

Given(
  'the first period started {int} weeks before this week',
  // biome-ignore lint/correctness/noEmptyPattern: playwright-bdd requires a destructured first argument.
  async ({}, weeks: number) => {
    startFirstPeriodWeeksAgo(weeks)
  },
)

Given(
  'the weekly goal of {int} window(s) was set {int} weeks before this week',
  // biome-ignore lint/correctness/noEmptyPattern: playwright-bdd requires a destructured first argument.
  async ({}, windows: number, weeks: number) => {
    setOnlyWeeklyGoal(windows, mondayOfThisWeekMs() - weeks * WEEK_MS)
  },
)

// 10h in São Paulo on Monday and on Thursday of each week, 3 sets of 10 reps with 40 kg.
Given(
  '{string} is trained on Monday and Thursday from {int} to {int} weeks before this week',
  async ({ request, program }, name: string, from: number, to: number) => {
    const exerciseSlug = await toExerciseSlug(request, name)
    const sets = Array.from({ length: 3 }, () => ({
      exerciseSlug,
      loadG: toLoadG('40 kg'),
      reps: 10,
    }))
    for (let weeks = from; weeks >= to; weeks -= 1) {
      const mondayMs = mondayOfThisWeekMs() - weeks * WEEK_MS + 10 * HOUR_MS
      for (const startedAtMs of [mondayMs, mondayMs + 72 * HOUR_MS]) {
        recordWorkout(programIdOf(program), 'A', sets, new Date(startedAtMs).toISOString())
      }
    }
  },
)

Then(
  'the game strip should show the streak of {int} weeks with the protection {word}',
  async ({ page }, weeks: number, protection: string) => {
    const word = weeks === 1 ? 'semana seguida' : 'semanas seguidas'
    const state = protection === 'used' ? 'usada' : 'disponível'
    await expect(
      page.getByRole('region', { name: 'Faixa de jogo' }).getByRole('img', {
        name: `${weeks} ${word} com a meta cumprida, proteção do período ${state}`,
      }),
    ).toBeVisible()
  },
)
