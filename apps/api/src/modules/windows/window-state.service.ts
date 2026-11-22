import type { Database } from '../../db/connection.js'
import { groupTrainingsOf, windowOf, windowStateOf } from './window.rules.js'
import { GAME_PARAMETERS } from './windows.config.js'
import { listMuscleGroups, listWorkoutSets } from './windows.repository.js'
import type { ActivityWindows } from './windows.schemas.js'

export function listActivityWindows(db: Database, now: Date): ActivityWindows {
  const trainingsOfGroup = groupTrainingsOf(
    listWorkoutSets(db).map(({ performedAt, ...set }) => ({
      ...set,
      performedAtMs: Date.parse(performedAt),
    })),
    GAME_PARAMETERS,
  )
  const groups = listMuscleGroups(db).map((muscleGroup) => {
    const lastTraining = trainingsOfGroup.get(muscleGroup.slug)?.at(-1)
    const window = lastTraining && windowOf(lastTraining, GAME_PARAMETERS)
    return {
      muscleGroup,
      state: windowStateOf(lastTraining, GAME_PARAMETERS, now.getTime()),
      lastTrainedAt: lastTraining ? new Date(lastTraining.trainedAtMs).toISOString() : null,
      opensAt: window ? new Date(window.opensAtMs).toISOString() : null,
      closesAt: window ? new Date(window.closesAtMs).toISOString() : null,
    }
  })
  return { now: now.toISOString(), groups }
}
