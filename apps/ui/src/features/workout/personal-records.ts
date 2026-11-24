import {
  isPersonalRecord,
  type PersonalRecord,
  personalRecordFlags,
  personalRecordsOf,
  recordLoadGFor,
} from '@heavy-duty/game'
import type { TodayExercise } from './today.types'
import type { RecordWorkoutSetBody } from './workout-set.types'

// The mark beside the load: the record for the reps on screen, null when those reps have none,
// and whether the values on screen beat a record (D59).
export type RecordMark = { loadG: number | null; passed: boolean }

type MarkValues = { loadG: number; reps: number | null }

// A copy of the workout of the day saved before the records existed has none.
function pastRecordsOf(planned: TodayExercise): PersonalRecord[] {
  return planned.records ?? []
}

function setsOfExercise(
  recorded: readonly RecordWorkoutSetBody[],
  exerciseId: string,
): RecordWorkoutSetBody[] {
  return recorded.filter((set) => set.exerciseId === exerciseId)
}

function recordSetOf(set: RecordWorkoutSetBody) {
  return { loadG: set.loadG, reps: set.reps ?? null }
}

// The records frozen at the start of the workout plus the sets recorded since (ADR-034).
export function recordMarkFor(
  planned: TodayExercise,
  recorded: readonly RecordWorkoutSetBody[],
  values: MarkValues,
): RecordMark | null {
  if (planned.exercise.kind !== 'reps') return null
  const done = setsOfExercise(recorded, planned.exercise.id).map(recordSetOf)
  const records = personalRecordsOf([...pastRecordsOf(planned), ...done])
  const loadG = recordLoadGFor(records, values.reps)
  const passed = isPersonalRecord(values, records)
  return loadG === null && !passed ? null : { loadG, passed }
}

// The ids of the recorded sets that beat a record, each against the sets before it (D59).
export function recordSetIdsOf(
  exercises: readonly TodayExercise[],
  recorded: readonly RecordWorkoutSetBody[],
): ReadonlySet<string> {
  const ids = new Set<string>()
  const seen = new Set<string>()
  for (const planned of exercises) {
    if (planned.exercise.kind !== 'reps' || seen.has(planned.exercise.id)) continue
    seen.add(planned.exercise.id)
    const sets = setsOfExercise(recorded, planned.exercise.id)
    const flags = personalRecordFlags(pastRecordsOf(planned), sets.map(recordSetOf))
    sets.forEach((set, index) => {
      if (flags[index]) ids.add(set.id)
    })
  }
  return ids
}
