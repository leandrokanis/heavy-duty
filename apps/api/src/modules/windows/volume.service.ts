import type { Database } from '../../db/connection.js'
import { MAX_WORKOUT_RANGE_DAYS, parseUtcRange } from '../workouts/utc-range.js'
import { volumeByMuscleGroup } from './volume.rules.js'
import { GAME_PARAMETERS } from './windows.config.js'
import { listMuscleGroups, listSetsPerformedBetween } from './windows.repository.js'
import type { MuscleGroupVolume, MuscleGroupVolumeQuery } from './windows.schemas.js'

const ZERO_VOLUME = { volumeG: 0, timeSeconds: 0 }

export function getMuscleGroupVolume(
  db: Database,
  query: MuscleGroupVolumeQuery,
): MuscleGroupVolume {
  const { from, to } = parseUtcRange(query, MAX_WORKOUT_RANGE_DAYS)
  const previousFrom = new Date(2 * Date.parse(from) - Date.parse(to)).toISOString()
  const sets = listSetsPerformedBetween(db, previousFrom, to)
  const current = volumeByMuscleGroup(
    sets.filter((set) => set.performedAt >= from),
    GAME_PARAMETERS,
  )
  const previous = volumeByMuscleGroup(
    sets.filter((set) => set.performedAt < from),
    GAME_PARAMETERS,
  )
  return {
    from,
    to,
    previousFrom,
    previousTo: from,
    groups: listMuscleGroups(db).map((group) => {
      const { volumeG, timeSeconds } = current.get(group.slug) ?? ZERO_VOLUME
      const previousVolume = previous.get(group.slug) ?? ZERO_VOLUME
      return {
        muscleGroup: group,
        volumeG,
        previousVolumeG: previousVolume.volumeG,
        changePercent: changePercent(volumeG, previousVolume.volumeG),
        timeSeconds,
        previousTimeSeconds: previousVolume.timeSeconds,
      }
    }),
  }
}

function changePercent(volumeG: number, previousVolumeG: number): number | null {
  if (previousVolumeG === 0) {
    return null
  }
  return Math.round(((volumeG - previousVolumeG) * 100) / previousVolumeG)
}
