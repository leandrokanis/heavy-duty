import { expect, type Locator, type Page } from '@playwright/test'
import type { ProgramState } from './program-fixtures.js'
import { settledBox } from './touch-target.js'

const COUNTDOWN_MS = 3000

// The distance of one step of the wheel, as in workout.config.ts (DRAG_STEP_PX).
const DRAG_STEP_PX = 22
const MOVES_PER_STEP = 2

export type DragPointer = 'mouse' | 'touch'

// Up raises the value: the larger value sits below, so the finger pushes it up. The touch drag
// goes through the CDP, because the sheet tells a finger from a mouse by the event it gets.
export async function dragWheel(
  wheel: Locator,
  steps: number,
  direction: string,
  pointer: DragPointer = 'mouse',
  // Runs after each move, with the pointer still down.
  onMove: () => Promise<void> = async () => {},
): Promise<void> {
  const box = await settledBox(wheel)
  if (!box) throw new Error('The wheel is not on screen')
  const x = box.x + box.width / 2
  const y = box.y + box.height / 2
  const sign = direction === 'down' ? 1 : -1
  const points = Array.from(
    { length: steps * MOVES_PER_STEP },
    (_, index) => y + (sign * (index + 1) * DRAG_STEP_PX) / MOVES_PER_STEP,
  )
  const page = wheel.page()
  if (pointer === 'mouse') {
    await page.mouse.move(x, y)
    await page.mouse.down()
    for (const pointY of points) {
      await page.mouse.move(x, pointY)
      await onMove()
    }
    await page.mouse.up()
    return
  }
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
  for (const pointY of points) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x, y: pointY }],
    })
    await onMove()
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await cdp.detach()
}

// Reads a wheel of the set screen by its aria-valuenow, the way the athlete reads the value.
export async function expectWheel(page: Page, name: string, value: string): Promise<void> {
  await expect(page.getByRole('spinbutton', { name })).toHaveAttribute(
    'aria-valuenow',
    value.replace(',', '.'),
  )
}

// Records the 3 sets of the exercise on screen, one tap a second apart, and skips each rest with
// the next tap; the send of each set is awaited, so the workout id is known afterwards. A timed
// exercise ends by the clock: the tap opens the count, and the helper moves the clock to the end
// of the execution.
export async function recordThreeSets(
  page: Page,
  program: ProgramState,
  firstTapAt: string,
): Promise<void> {
  const nextButton = page.getByRole('button', { name: 'Próximo' })
  const timeWheel = page.getByRole('spinbutton', { name: 'Tempo' })
  const targetSeconds =
    (await timeWheel.count()) > 0 ? await timeWheel.getAttribute('aria-valuenow') : null
  let tapAtMs = Date.parse(firstTapAt)
  for (let set = 0; set < 3; set += 1) {
    await page.clock.setFixedTime(new Date(tapAtMs))
    const sent = page.waitForResponse(
      (response) => response.url().includes('/sets') && response.request().method() === 'POST',
    )
    await nextButton.click()
    if (targetSeconds !== null) {
      await expect(page.getByRole('timer', { name: 'Contagem para começar' })).toBeVisible()
      tapAtMs += COUNTDOWN_MS + Number(targetSeconds) * 1000
      await page.clock.setFixedTime(new Date(tapAtMs))
    }
    const response = await sent
    program.workoutId ??= /\/api\/workouts\/([^/]+)\/sets/.exec(response.url())?.[1]
    tapAtMs += 1000
    await page.clock.setFixedTime(new Date(tapAtMs))
    await nextButton.click()
    await expect(page.getByRole('timer', { name: 'Descanso' })).toHaveCount(0)
    tapAtMs += 1000
  }
}
