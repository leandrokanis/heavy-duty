import { rankOf } from '@heavy-duty/game'
import type { CurrentPeriod } from '@/features/period/period.types'
import { type WorkoutFlowState, workoutPointsOf } from './workout-flow'

// The points of the workout and its position in the personal ranking of the period (D105); null
// position with no ranking known.
export type WorkoutRank = { points: number; position: number | null }

// The points of the workouts of the period at "Começar" (adendo da 7b na ADR-034). A copy of a
// period that ended before the start leaves the workout in a new period, with none to beat.
export function frozenPeriodPointsOf(
  period: CurrentPeriod | null,
  startedAtMs: number,
): number[] | null {
  if (period === null) return null
  if (startedAtMs >= Date.parse(period.endsAt)) return []
  return (period.ranking ?? []).map(({ points }) => points)
}

export function provisionalRankOf(state: WorkoutFlowState): WorkoutRank {
  const points = workoutPointsOf(state)
  const periodPoints = state.session.periodPoints ?? null
  return { points, position: periodPoints === null ? null : rankOf(points, periodPoints) }
}

// The answer of the API replaces the provisional rank once it holds the workout.
export function rankInPeriodOf(period: CurrentPeriod, workoutId: string): WorkoutRank | null {
  const ranked = (period.ranking ?? []).find((workout) => workout.workoutId === workoutId)
  return ranked ? { points: ranked.points, position: ranked.position } : null
}

export function rankTextOf(position: number): string {
  return `${position}º do período`
}
