import { describe, expect, it } from 'vitest'
import { type Cue, cueBetween } from './timer-cues'
import type { TimerReading } from './workout-flow'

const T = 1_000_000

function reading(
  stage: TimerReading['stage'],
  value: number,
  atMs: number,
  lastStep: TimerReading['lastStep'] = null,
): TimerReading {
  return { stage, value, lastStep, atMs }
}

describe('Given two readings of the timer less than 1 s apart', () => {
  describe.each<{ name: string; previous: TimerReading; current: TimerReading; cue: Cue | null }>([
    {
      name: 'off to the count at 3',
      previous: reading('off', 0, T),
      current: reading('countdown', 3, T + 100, 'countdown'),
      cue: 'count',
    },
    {
      name: 'the count from 3 to 2',
      previous: reading('countdown', 3, T),
      current: reading('countdown', 2, T + 250),
      cue: 'count',
    },
    {
      name: 'the count still at 3',
      previous: reading('countdown', 3, T),
      current: reading('countdown', 3, T + 250),
      cue: null,
    },
    {
      name: 'the count at 1 to the execution at 45',
      previous: reading('countdown', 1, T),
      current: reading('execution', 45, T + 250, 'begin'),
      cue: 'start',
    },
    {
      name: 'the count at 1 to the execution at 3 (target of 3 s)',
      previous: reading('countdown', 1, T),
      current: reading('execution', 3, T + 250, 'begin'),
      cue: 'start',
    },
    {
      name: 'the execution from 4 to 3',
      previous: reading('execution', 4, T),
      current: reading('execution', 3, T + 250),
      cue: 'warning',
    },
    {
      name: 'the execution from 3 to 2',
      previous: reading('execution', 3, T),
      current: reading('execution', 2, T + 250),
      cue: 'warning',
    },
    {
      name: 'the execution from 2 to 1',
      previous: reading('execution', 2, T),
      current: reading('execution', 1, T + 250),
      cue: 'warning',
    },
    {
      name: 'the execution from 45 to 44',
      previous: reading('execution', 45, T),
      current: reading('execution', 44, T + 250),
      cue: null,
    },
    {
      name: 'the execution ending by the clock',
      previous: reading('execution', 1, T),
      current: reading('off', 0, T + 250, 'timerEnd'),
      cue: 'end',
    },
    {
      name: 'the execution ended early by a tap',
      previous: reading('execution', 30, T),
      current: reading('off', 0, T + 250, 'record'),
      cue: null,
    },
    {
      name: 'the execution cancelled',
      previous: reading('execution', 30, T),
      current: reading('off', 0, T + 250, 'cancel'),
      cue: null,
    },
  ])('When the reading goes from $name', ({ previous, current, cue }) => {
    it(`Then the cue should be ${cue}`, () => {
      expect(cueBetween(previous, current)).toBe(cue)
    })
  })
})

describe('Given two readings of the timer more than 1 s apart (the app came back)', () => {
  describe('When the execution at 1 s left is followed by the end', () => {
    it('Then no cue should sound', () => {
      const previous = reading('execution', 1, T)

      expect(cueBetween(previous, reading('off', 0, T + 1001, 'timerEnd'))).toBeNull()
    })
  })

  describe('When the count at 3 is followed by the execution', () => {
    it('Then no cue should sound', () => {
      const previous = reading('countdown', 3, T)

      expect(cueBetween(previous, reading('execution', 45, T + 1001, 'begin'))).toBeNull()
    })
  })
})
