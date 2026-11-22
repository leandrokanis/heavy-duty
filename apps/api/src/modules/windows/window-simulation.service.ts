import type { Database } from '../../db/connection.js'
import { DomainError } from '../../errors/domain-error.js'
import { parseUtcRange } from '../workouts/utc-range.js'
import { groupTrainingsOf, simulateGroupWindows, summarizeWindows } from './window.rules.js'
import { resolveWindowParameters } from './window-parameters.js'
import { listMuscleGroups, listWorkoutSets } from './windows.repository.js'
import type { ActivityWindowSimulation, SimulateActivityWindowsQuery } from './windows.schemas.js'

const MAX_SIMULATION_RANGE_DAYS = 366

export function simulateActivityWindows(
  db: Database,
  query: SimulateActivityWindowsQuery,
  now: Date,
): ActivityWindowSimulation {
  const range =
    query.from === undefined && query.to === undefined
      ? null
      : parseUtcRange(query, MAX_SIMULATION_RANGE_DAYS)
  const parameters = resolveWindowParameters(query.parameters)
  const catalog = listMuscleGroups(db)
  if (query.muscleGroupSlug && !catalog.some(({ slug }) => slug === query.muscleGroupSlug)) {
    throw new DomainError(
      'muscle_group_not_found',
      'grupo muscular não encontrado',
      'not_found_reference',
    )
  }
  const trainingsOfGroup = groupTrainingsOf(
    listWorkoutSets(db).map(({ performedAt, ...set }) => ({
      ...set,
      performedAtMs: Date.parse(performedAt),
    })),
    parameters,
  )
  const fromMs = range ? Date.parse(range.from) : Number.NEGATIVE_INFINITY
  const toMs = range ? Date.parse(range.to) : Number.POSITIVE_INFINITY
  const groups = catalog
    .filter(({ slug }) => !query.muscleGroupSlug || slug === query.muscleGroupSlug)
    .flatMap((muscleGroup) => {
      const { trainings } = simulateGroupWindows(
        trainingsOfGroup.get(muscleGroup.slug) ?? [],
        parameters,
        now.getTime(),
      )
      const inRange = trainings.filter(
        ({ trainedAtMs }) => trainedAtMs >= fromMs && trainedAtMs < toMs,
      )
      if (inRange.length === 0) {
        return []
      }
      return [
        {
          muscleGroup,
          summary: summarizeWindows(inRange),
          trainings: inRange.map((training) => ({
            workoutId: training.workoutId,
            letter: training.letter,
            trainedAt: new Date(training.trainedAtMs).toISOString(),
            goal: training.goal,
            volumeG: training.volumeG,
            adjustedVolumeG: training.adjustedVolumeG,
            relation: training.relation,
            window: {
              opensAt: new Date(training.opensAtMs).toISOString(),
              closesAt: new Date(training.closesAtMs).toISOString(),
              outcome: training.outcome,
            },
          })),
        },
      ]
    })
  return { parameters, from: range?.from ?? null, to: range?.to ?? null, groups }
}
