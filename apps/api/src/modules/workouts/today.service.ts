import type { Database } from '../../db/connection.js'
import {
  findActiveProgramRow,
  listPlannedExerciseRows,
  listProgramDayRows,
} from '../programs/program.repository.js'
import { findLastLoadG, findLastWorkoutLetter } from './today.repository.js'
import { estimateDurationSeconds, suggestLetter } from './today.rules.js'
import type { LoadSource, Today, TodayDay, TodayExercise } from './workouts.schemas.js'

export function getToday(db: Database): Today {
  const program = findActiveProgramRow(db)
  if (!program) {
    return { program: null, suggestedLetter: null, days: [] }
  }
  const dayRows = listProgramDayRows(db, [program.id])
  const plannedRows = listPlannedExerciseRows(
    db,
    dayRows.map((day) => day.id),
  )
  const lastLoads = new Map<string, number | undefined>()
  for (const planned of plannedRows) {
    if (!lastLoads.has(planned.exercise.id)) {
      lastLoads.set(planned.exercise.id, findLastLoadG(db, planned.exercise.id))
    }
  }
  const days = dayRows.map((day): TodayDay => {
    const exercises = plannedRows
      .filter((planned) => planned.programDayId === day.id)
      .map((planned): TodayExercise => {
        const lastLoadG = lastLoads.get(planned.exercise.id)
        const loadSource: LoadSource = lastLoadG === undefined ? 'program' : 'last_workout'
        return {
          exercise: planned.exercise,
          sets: planned.sets,
          targetReps: planned.targetReps,
          targetSeconds: planned.targetSeconds,
          restSeconds: planned.restSeconds,
          plannedLoadG: planned.loadG,
          loadG: lastLoadG ?? planned.loadG,
          loadSource,
        }
      })
    return {
      letter: day.letter,
      label: day.label,
      estimatedDurationSeconds: estimateDurationSeconds(exercises),
      exercises,
    }
  })
  return {
    program: { id: program.id, name: program.name, goal: program.goal },
    suggestedLetter: suggestLetter(days, findLastWorkoutLetter(db, program.id)),
    days,
  }
}
