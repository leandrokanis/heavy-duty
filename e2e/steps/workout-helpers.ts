import { expect, type Page } from '@playwright/test'
import type { ProgramState } from './program-fixtures.js'

// Records the 3 sets of the exercise on screen, one tap a second apart, and skips each rest with
// the next tap; the send of each set is awaited, so the workout id is known afterwards.
export async function recordThreeSets(
  page: Page,
  program: ProgramState,
  firstTapAt: string,
): Promise<void> {
  const nextButton = page.getByRole('button', { name: 'Próximo' })
  let tapAtMs = Date.parse(firstTapAt)
  for (let set = 0; set < 3; set += 1) {
    await page.clock.setFixedTime(new Date(tapAtMs))
    const sent = page.waitForResponse(
      (response) => response.url().includes('/sets') && response.request().method() === 'POST',
    )
    await nextButton.click()
    const response = await sent
    program.workoutId ??= /\/api\/workouts\/([^/]+)\/sets/.exec(response.url())?.[1]
    tapAtMs += 1000
    await page.clock.setFixedTime(new Date(tapAtMs))
    await nextButton.click()
    await expect(page.getByRole('timer', { name: 'Descanso' })).toHaveCount(0)
    tapAtMs += 1000
  }
}
