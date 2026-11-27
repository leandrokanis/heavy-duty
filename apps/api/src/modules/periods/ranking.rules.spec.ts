import { describe, expect, it } from 'vitest'
import { periodRankingOf, pointsStartedBetween } from './ranking.rules.js'

const STARTS_AT_MS = Date.parse('2026-11-23T03:00:00.000Z')
const ENDS_AT_MS = STARTS_AT_MS + 84 * 24 * 60 * 60 * 1000

const workout = (id: string, letter: string, startedAt: string) => ({ id, letter, startedAt })
const setPoints = (workoutId: string, points: number[]) =>
  points.map((value, index) => ({ workoutId, performedAtMs: index, points: value }))

const rankingOf = (workouts: ReturnType<typeof workout>[], points: ReturnType<typeof setPoints>) =>
  periodRankingOf({ workouts, setPoints: points, startsAtMs: STARTS_AT_MS, endsAtMs: ENDS_AT_MS })

describe('periodRankingOf', () => {
  describe('Given three workouts of the period with 60, 90 and 30 points', () => {
    const ranking = rankingOf(
      [
        workout('w1', 'A', '2026-11-23T10:00:00.000Z'),
        workout('w2', 'B', '2026-11-25T10:00:00.000Z'),
        workout('w3', 'A', '2026-11-27T10:00:00.000Z'),
      ],
      [
        ...setPoints('w1', [20, 20, 20]),
        ...setPoints('w2', [30, 30, 30]),
        ...setPoints('w3', [10, 20]),
      ],
    )

    it('Then the workouts come in the order of points, with the position of each', () => {
      expect(ranking).toEqual([
        {
          workoutId: 'w2',
          letter: 'B',
          startedAt: '2026-11-25T10:00:00.000Z',
          points: 90,
          position: 1,
        },
        {
          workoutId: 'w1',
          letter: 'A',
          startedAt: '2026-11-23T10:00:00.000Z',
          points: 60,
          position: 2,
        },
        {
          workoutId: 'w3',
          letter: 'A',
          startedAt: '2026-11-27T10:00:00.000Z',
          points: 30,
          position: 3,
        },
      ])
    })
  })

  describe('Given two workouts tied at the top', () => {
    it('Then both share the first position, the earlier first, and the next one is third', () => {
      const ranking = rankingOf(
        [
          workout('late', 'B', '2026-11-25T10:00:00.000Z'),
          workout('early', 'A', '2026-11-23T10:00:00.000Z'),
          workout('low', 'C', '2026-11-24T10:00:00.000Z'),
        ],
        [...setPoints('late', [40]), ...setPoints('early', [40]), ...setPoints('low', [10])],
      )

      expect(ranking.map(({ workoutId, position }) => [workoutId, position])).toEqual([
        ['early', 1],
        ['late', 1],
        ['low', 3],
      ])
    })
  })

  describe('Given workouts that started before the period and at its end', () => {
    it('Then only the workout that started in the period counts, by its start', () => {
      const ranking = rankingOf(
        [
          workout('before', 'A', '2026-11-23T02:59:59.999Z'),
          workout('inside', 'B', '2026-11-23T03:00:00.000Z'),
          workout('next', 'C', new Date(ENDS_AT_MS).toISOString()),
        ],
        [...setPoints('before', [10]), ...setPoints('inside', [10]), ...setPoints('next', [10])],
      )

      expect(ranking.map(({ workoutId }) => workoutId)).toEqual(['inside'])
    })
  })

  describe('Given a workout of the period with no set yet', () => {
    it('Then it counts with 0 points', () => {
      const ranking = rankingOf([workout('empty', 'A', '2026-11-24T10:00:00.000Z')], [])

      expect(ranking).toEqual([
        {
          workoutId: 'empty',
          letter: 'A',
          startedAt: '2026-11-24T10:00:00.000Z',
          points: 0,
          position: 1,
        },
      ])
    })
  })
})

describe('pointsStartedBetween (D102)', () => {
  const ranking = rankingOf(
    [
      workout('monday', 'A', '2026-11-23T10:00:00.000Z'),
      workout('sunday', 'B', '2026-11-30T02:59:59.999Z'),
      workout('next', 'A', '2026-11-30T03:00:00.000Z'),
    ],
    [...setPoints('monday', [30]), ...setPoints('sunday', [20]), ...setPoints('next', [50])],
  )

  describe('Given workouts in week 1 of the period and one at the start of week 2', () => {
    it('Then week 1 sums the points of the workouts that started in it', () => {
      expect(
        pointsStartedBetween(ranking, STARTS_AT_MS, Date.parse('2026-11-30T03:00:00.000Z')),
      ).toBe(50)
    })
  })

  describe('Given a week with no workout', () => {
    it('Then the week has 0 points', () => {
      expect(
        pointsStartedBetween(
          ranking,
          Date.parse('2026-12-07T03:00:00.000Z'),
          Date.parse('2026-12-14T03:00:00.000Z'),
        ),
      ).toBe(0)
    })
  })
})
