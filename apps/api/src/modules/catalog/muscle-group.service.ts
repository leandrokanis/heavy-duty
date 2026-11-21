import type { Database } from '../../db/connection.js'
import type { MuscleGroup } from './catalog.schemas.js'
import { listMuscleGroupRows } from './muscle-group.repository.js'

export function listMuscleGroups(db: Database): { muscleGroups: MuscleGroup[] } {
  return { muscleGroups: listMuscleGroupRows(db) }
}
