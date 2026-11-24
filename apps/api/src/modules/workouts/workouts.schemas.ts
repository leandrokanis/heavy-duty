import { z } from '@hono/zod-openapi'
import { ExerciseKindSchema } from '../catalog/catalog.schemas.js'
import { GoalSchema } from '../programs/programs.schemas.js'

export const LoadSourceSchema = z.enum(['program', 'last_workout']).openapi('LoadSource')

export const PersonalRecordSchema = z
  .object({
    reps: z.number().int().openapi({ example: 10 }),
    loadG: z.number().int().openapi({ example: 42500 }),
  })
  .openapi('PersonalRecord', {
    description:
      'A personal record of the exercise: the top load for a reps count, or the most reps for a load',
  })

export const TodayExerciseSchema = z
  .object({
    plannedExerciseId: z.string().openapi({ example: '0193a1b2-0000-7000-8000-000000000401' }),
    exercise: z.object({
      id: z.string().openapi({ example: '0193a1b2-0000-7000-8000-000000000201' }),
      slug: z.string().openapi({ example: 'supino-reto' }),
      name: z.string().openapi({ example: 'Supino reto' }),
      kind: ExerciseKindSchema,
    }),
    sets: z.number().int().openapi({ example: 3 }),
    targetReps: z.number().int().nullable().openapi({ example: 10 }),
    targetSeconds: z.number().int().nullable().openapi({ example: null }),
    restSeconds: z.number().int().openapi({ example: 90 }),
    plannedLoadG: z.number().int().openapi({ example: 40000 }),
    loadG: z.number().int().openapi({ example: 42500 }),
    loadSource: LoadSourceSchema,
    muscleGroups: z.array(
      z.object({
        slug: z.string().openapi({ example: 'chest' }),
        name: z.string().openapi({ example: 'peito' }),
      }),
    ),
    records: z.array(PersonalRecordSchema).openapi({
      description:
        'Personal records of the exercise over the whole history, by exercise; empty for a timed exercise',
    }),
  })
  .openapi('TodayExercise')

export const TodayDaySchema = z
  .object({
    letter: z.string().openapi({ example: 'A' }),
    label: z.string().nullable().openapi({ example: 'Superior' }),
    estimatedDurationSeconds: z.number().int().openapi({ example: 675 }),
    exercises: z.array(TodayExerciseSchema),
  })
  .openapi('TodayDay')

export const TodaySchema = z
  .object({
    program: z
      .object({
        id: z.string().openapi({ example: '0193a1b2-0000-7000-8000-000000000301' }),
        name: z.string().openapi({ example: 'Programa 1' }),
        goal: GoalSchema,
      })
      .nullable(),
    suggestedLetter: z.string().nullable().openapi({ example: 'A' }),
    days: z.array(TodayDaySchema),
  })
  .openapi('Today')

export type LoadSource = z.infer<typeof LoadSourceSchema>
export type TodayExercise = z.infer<typeof TodayExerciseSchema>
export type TodayDay = z.infer<typeof TodayDaySchema>
export type Today = z.infer<typeof TodaySchema>

// Domain values (negative load, zero reps, letter, measure by kind) are plain
// numbers and strings here so the service refuses them with their own code.
export const RecordWorkoutSetBodySchema = z
  .object({
    id: z.uuid().openapi({ example: '0193a1b2-0000-7000-8000-000000000501' }),
    workout: z.object({
      programId: z.uuid().openapi({ example: '0193a1b2-0000-7000-8000-000000000301' }),
      letter: z.string().openapi({ example: 'A' }),
      startedAt: z.iso.datetime().openapi({ example: '2026-11-21T18:30:00.000Z' }),
    }),
    plannedExerciseId: z.uuid().openapi({ example: '0193a1b2-0000-7000-8000-000000000401' }),
    exerciseId: z.uuid().openapi({ example: '0193a1b2-0000-7000-8000-000000000201' }),
    setNumber: z.number().int().openapi({ example: 1 }),
    loadG: z.number().int().openapi({ example: 40000 }),
    reps: z.number().int().optional().openapi({ example: 10 }),
    seconds: z.number().int().optional().openapi({ example: 45 }),
    performedAt: z.iso.datetime().openapi({ example: '2026-11-21T18:31:05.000Z' }),
  })
  .openapi('RecordWorkoutSetBody')

// Domain values stay plain integers here so the service refuses them with their own code.
export const CorrectWorkoutSetBodySchema = z
  .object({
    loadG: z.number().int().openapi({ example: 42500 }),
    reps: z.number().int().optional().openapi({ example: 10 }),
    seconds: z.number().int().optional().openapi({ example: 45 }),
  })
  .openapi('CorrectWorkoutSetBody')

export const WorkoutSetSchema = z
  .object({
    id: z.string().openapi({ example: '0193a1b2-0000-7000-8000-000000000501' }),
    workoutId: z.string().openapi({ example: '0193a1b2-0000-7000-8000-000000000601' }),
    exerciseId: z.string().openapi({ example: '0193a1b2-0000-7000-8000-000000000201' }),
    plannedExerciseId: z
      .string()
      .nullable()
      .openapi({ example: '0193a1b2-0000-7000-8000-000000000401' }),
    setNumber: z.number().int().openapi({ example: 1 }),
    loadG: z.number().int().openapi({ example: 40000 }),
    reps: z.number().int().nullable().openapi({ example: 10 }),
    seconds: z.number().int().nullable().openapi({ example: null }),
    performedAt: z.string().openapi({ example: '2026-11-21T18:31:05.000Z' }),
  })
  .openapi('WorkoutSet')

export const WorkoutIdParamsSchema = z.object({
  workoutId: z.uuid().openapi({
    param: { name: 'workoutId', in: 'path' },
    example: '0193a1b2-0000-7000-8000-000000000601',
  }),
})

export const WorkoutSetParamsSchema = z.object({
  workoutId: z.uuid().openapi({
    param: { name: 'workoutId', in: 'path' },
    example: '0193a1b2-0000-7000-8000-000000000601',
  }),
  setId: z.uuid().openapi({
    param: { name: 'setId', in: 'path' },
    example: '0193a1b2-0000-7000-8000-000000000501',
  }),
})

export const WorkoutEndReasonSchema = z
  .enum(['completed', 'ended_early'])
  .openapi('WorkoutEndReason')

// Both fields stay plain strings so the service refuses them with their own code.
export const FinishWorkoutBodySchema = z
  .object({
    finishedAt: z.string().openapi({ example: '2026-11-21T19:20:00.000Z' }),
    endReason: z.string().openapi({ example: 'ended_early' }),
  })
  .openapi('FinishWorkoutBody')

export const WorkoutSchema = z
  .object({
    id: z.string().openapi({ example: '0193a1b2-0000-7000-8000-000000000601' }),
    programId: z.string().openapi({ example: '0193a1b2-0000-7000-8000-000000000301' }),
    letter: z.string().openapi({ example: 'A' }),
    startedAt: z.string().openapi({ example: '2026-11-21T18:30:00.000Z' }),
    finishedAt: z.string().nullable().openapi({ example: '2026-11-21T19:20:00.000Z' }),
    endReason: WorkoutEndReasonSchema.nullable(),
  })
  .openapi('Workout')

// skippedAt stays a plain string so the service refuses it with its own code.
export const RecordWorkoutSkipBodySchema = z
  .object({
    plannedExerciseId: z.uuid().openapi({ example: '0193a1b2-0000-7000-8000-000000000402' }),
    skippedAt: z.string().openapi({ example: '2026-11-21T18:40:00.000Z' }),
  })
  .openapi('RecordWorkoutSkipBody')

export const WorkoutSkipSchema = z
  .object({
    workoutId: z.string().openapi({ example: '0193a1b2-0000-7000-8000-000000000601' }),
    exerciseId: z.string().openapi({ example: '0193a1b2-0000-7000-8000-000000000202' }),
    plannedExerciseId: z
      .string()
      .nullable()
      .openapi({ example: '0193a1b2-0000-7000-8000-000000000402' }),
    skippedAt: z.string().openapi({ example: '2026-11-21T18:40:00.000Z' }),
  })
  .openapi('WorkoutSkip')

// from and to stay plain strings so the service refuses them with its own code.
export const ListWorkoutsQuerySchema = z.object({
  from: z
    .string()
    .optional()
    .openapi({
      param: { name: 'from', in: 'query' },
      example: '2026-11-09T03:00:00.000Z',
    }),
  to: z
    .string()
    .optional()
    .openapi({
      param: { name: 'to', in: 'query' },
      example: '2026-11-16T03:00:00.000Z',
    }),
})

export const ExerciseSummarySchema = z
  .object({
    id: z.string().openapi({ example: '0193a1b2-0000-7000-8000-000000000201' }),
    slug: z.string().openapi({ example: 'supino-reto' }),
    name: z.string().openapi({ example: 'Supino reto' }),
    kind: ExerciseKindSchema,
  })
  .openapi('ExerciseSummary')

export const HistorySetSchema = z
  .object({
    id: z.string().openapi({ example: '0193a1b2-0000-7000-8000-000000000501' }),
    setNumber: z.number().int().openapi({ example: 1 }),
    loadG: z.number().int().openapi({ example: 40000 }),
    reps: z.number().int().nullable().openapi({ example: 10 }),
    seconds: z.number().int().nullable().openapi({ example: null }),
    performedAt: z.string().openapi({ example: '2026-11-21T18:31:05.000Z' }),
    correctedAt: z.string().nullable().openapi({ example: null }),
  })
  .openapi('HistorySet')

export const HistoryExerciseSchema = z
  .object({
    exercise: ExerciseSummarySchema,
    sets: z.array(HistorySetSchema),
  })
  .openapi('HistoryExercise')

export const HistoryWorkoutSchema = z
  .object({
    id: z.string().openapi({ example: '0193a1b2-0000-7000-8000-000000000601' }),
    program: z.object({
      id: z.string().openapi({ example: '0193a1b2-0000-7000-8000-000000000301' }),
      name: z.string().openapi({ example: 'Programa 1' }),
    }),
    letter: z.string().openapi({ example: 'A' }),
    label: z.string().nullable().openapi({ example: 'Superior' }),
    startedAt: z.string().openapi({ example: '2026-11-21T18:30:00.000Z' }),
    finishedAt: z.string().nullable().openapi({ example: '2026-11-21T19:20:00.000Z' }),
    endReason: WorkoutEndReasonSchema.nullable(),
    exercises: z.array(HistoryExerciseSchema),
    leftOut: z.array(ExerciseSummarySchema),
  })
  .openapi('HistoryWorkout')

export const WorkoutHistorySchema = z
  .object({ workouts: z.array(HistoryWorkoutSchema) })
  .openapi('WorkoutHistory')

// Optional free strings, so a missing or empty value reaches the service and gets its domain error.
export const RemoveWorkoutInputSchema = z.object({
  workoutId: z.string().optional(),
  confirmationCode: z.string().optional(),
})

export const WorkoutRemovalSchema = z.object({
  applied: z.boolean(),
  confirmationCode: z.string().nullable(),
  workout: HistoryWorkoutSchema,
})

export const EditWorkoutSetInputSchema = z.object({
  workoutId: z.string().optional(),
  setId: z.string().optional(),
  loadG: z.number().int().optional(),
  reps: z.number().int().optional(),
  seconds: z.number().int().optional(),
  confirmationCode: z.string().optional(),
})

export const SetValuesSchema = z.object({
  loadG: z.number().int(),
  reps: z.number().int().nullable(),
  seconds: z.number().int().nullable(),
})

export const WorkoutSetEditSchema = z.object({
  applied: z.boolean(),
  confirmationCode: z.string().nullable(),
  workout: z.object({ id: z.string(), letter: z.string(), startedAt: z.string() }),
  exercise: ExerciseSummarySchema,
  set: z.object({ id: z.string(), setNumber: z.number().int() }),
  before: SetValuesSchema,
  after: SetValuesSchema,
})

export type EditWorkoutSetInput = z.infer<typeof EditWorkoutSetInputSchema>
export type WorkoutSetEdit = z.infer<typeof WorkoutSetEditSchema>
export type RemoveWorkoutInput = z.infer<typeof RemoveWorkoutInputSchema>
export type WorkoutRemoval = z.infer<typeof WorkoutRemovalSchema>
export type ListWorkoutsQuery = z.infer<typeof ListWorkoutsQuerySchema>
export type ExerciseSummary = z.infer<typeof ExerciseSummarySchema>
export type HistorySet = z.infer<typeof HistorySetSchema>
export type HistoryExercise = z.infer<typeof HistoryExerciseSchema>
export type HistoryWorkout = z.infer<typeof HistoryWorkoutSchema>
export type WorkoutHistory = z.infer<typeof WorkoutHistorySchema>

export type RecordWorkoutSetBody = z.infer<typeof RecordWorkoutSetBodySchema>
export type CorrectWorkoutSetBody = z.infer<typeof CorrectWorkoutSetBodySchema>
export type WorkoutSet = z.infer<typeof WorkoutSetSchema>
export type FinishWorkoutBody = z.infer<typeof FinishWorkoutBodySchema>
export type WorkoutEndReason = z.infer<typeof WorkoutEndReasonSchema>
export type Workout = z.infer<typeof WorkoutSchema>
export type RecordWorkoutSkipBody = z.infer<typeof RecordWorkoutSkipBodySchema>
export type WorkoutSkip = z.infer<typeof WorkoutSkipSchema>
