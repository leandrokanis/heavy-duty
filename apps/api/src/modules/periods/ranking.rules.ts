import { rankOf } from '@heavy-duty/game'
import type { SetPoints } from '../windows/progress.rules.js'

export type RankingWorkout = { id: string; letter: string; startedAt: string }

export type RankedWorkout = {
  workoutId: string
  letter: string
  startedAt: string
  points: number
  position: number
}

// Decision D105: a workout belongs to the period by its start, ended early or not, and its points
// are the points its sets showed. Ties share the position and keep the order of the start.
export function periodRankingOf({
  workouts,
  setPoints,
  startsAtMs,
  endsAtMs,
}: {
  workouts: RankingWorkout[]
  setPoints: SetPoints[]
  startsAtMs: number
  endsAtMs: number
}): RankedWorkout[] {
  const pointsOfWorkout = new Map<string, number>()
  for (const { workoutId, points } of setPoints) {
    pointsOfWorkout.set(workoutId, (pointsOfWorkout.get(workoutId) ?? 0) + points)
  }
  const inPeriod = workouts
    .filter(({ startedAt }) => {
      const startedAtMs = Date.parse(startedAt)
      return startsAtMs <= startedAtMs && startedAtMs < endsAtMs
    })
    .map(({ id, letter, startedAt }) => ({
      workoutId: id,
      letter,
      startedAt,
      points: pointsOfWorkout.get(id) ?? 0,
    }))
  const periodPoints = inPeriod.map(({ points }) => points)
  return inPeriod
    .map((workout) => ({ ...workout, position: rankOf(workout.points, periodPoints) }))
    .sort((a, b) => a.position - b.position || Date.parse(a.startedAt) - Date.parse(b.startedAt))
}

// Decision D102: the points of a week are the points of the workouts that started in it.
export function pointsStartedBetween(
  ranking: RankedWorkout[],
  fromMs: number,
  toMs: number,
): number {
  return ranking
    .filter(({ startedAt }) => {
      const startedAtMs = Date.parse(startedAt)
      return fromMs <= startedAtMs && startedAtMs < toMs
    })
    .reduce((total, { points }) => total + points, 0)
}
