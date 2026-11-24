import { levelCostOf, startingProgress, tierOf } from '@heavy-duty/game'
import type { Database } from '../../db/connection.js'
import { groupLevelsOf } from './progress.rules.js'
import { GAME_PARAMETERS } from './windows.config.js'
import { listMuscleGroups, listProgressSets } from './windows.repository.js'
import type { MuscleGroupLevels } from './windows.schemas.js'

// Derived from the whole history at each read (ADR-010), with the rules of @heavy-duty/game (ADR-034).
export function listMuscleGroupLevels(db: Database, now: Date): MuscleGroupLevels {
  const levels = groupLevelsOf(
    listProgressSets(db).map(
      ({ performedAt, plannedLoadG, targetReps, targetSeconds, ...set }) => ({
        ...set,
        performedAtMs: Date.parse(performedAt),
        plan: plannedLoadG === null ? null : { plannedLoadG, targetReps, targetSeconds },
      }),
    ),
    GAME_PARAMETERS,
    now.getTime(),
  )
  const groups = listMuscleGroups(db).map((muscleGroup) => {
    const state = levels.get(muscleGroup.slug)
    const { level, points, bestLevel } = state?.progress ?? startingProgress()
    return {
      muscleGroup,
      level,
      points,
      levelCost: levelCostOf(level),
      bestLevel,
      tier: tierOf(level),
      cooling: state?.cooling ?? false,
      nextDropAt:
        state?.nextDropAtMs === null || state === undefined
          ? null
          : new Date(state.nextDropAtMs).toISOString(),
    }
  })
  return { now: now.toISOString(), groups }
}
