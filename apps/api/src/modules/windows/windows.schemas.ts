import { z } from '@hono/zod-openapi'
import { GoalSchema } from '../programs/programs.schemas.js'

// from and to stay plain strings so the service refuses them with its own code.
export const MuscleGroupVolumeQuerySchema = z.object({
  from: z.string().optional().openapi({ example: '2026-11-09T03:00:00.000Z' }),
  to: z.string().optional().openapi({ example: '2026-11-16T03:00:00.000Z' }),
})

export const MuscleGroupVolumeRowSchema = z
  .object({
    muscleGroup: z.object({
      slug: z.string().openapi({ example: 'chest' }),
      name: z.string().openapi({ example: 'peito' }),
    }),
    volumeG: z.number().int().openapi({ example: 1200000 }),
    previousVolumeG: z.number().int().openapi({ example: 1000000 }),
    changePercent: z.number().int().nullable().openapi({ example: 20 }),
    timeSeconds: z.number().int().openapi({ example: 0 }),
    previousTimeSeconds: z.number().int().openapi({ example: 0 }),
  })
  .openapi('MuscleGroupVolumeRow')

export const MuscleGroupVolumeSchema = z
  .object({
    from: z.string().openapi({ example: '2026-11-09T03:00:00.000Z' }),
    to: z.string().openapi({ example: '2026-11-16T03:00:00.000Z' }),
    previousFrom: z.string().openapi({ example: '2026-11-02T03:00:00.000Z' }),
    previousTo: z.string().openapi({ example: '2026-11-09T03:00:00.000Z' }),
    groups: z.array(MuscleGroupVolumeRowSchema),
  })
  .openapi('MuscleGroupVolume')

export type MuscleGroupVolumeQuery = z.infer<typeof MuscleGroupVolumeQuerySchema>
export type MuscleGroupVolumeRow = z.infer<typeof MuscleGroupVolumeRowSchema>
export type MuscleGroupVolume = z.infer<typeof MuscleGroupVolumeSchema>

// The parameters stay plain numbers so the service refuses them with window_parameters_invalid.
const ByGoalOverrideSchema = z.object({
  strength: z.number().optional(),
  hypertrophy: z.number().optional(),
  endurance: z.number().optional(),
})

const ByGoalSchema = z.object({
  strength: z.number().int(),
  hypertrophy: z.number().int(),
  endurance: z.number().int(),
})

export const WindowParameterOverridesSchema = z
  .object({
    secondaryVolumePercent: z.number().optional().openapi({ example: 50 }),
    goalVolumePercent: ByGoalOverrideSchema.optional(),
    baseOpenHours: ByGoalOverrideSchema.optional(),
    openMinutesPerAdjustedKg: z.number().optional().openapi({ example: 1 }),
    maxOpenHours: z.number().optional().openapi({ example: 72 }),
    openDurationHours: ByGoalOverrideSchema.optional(),
  })
  .openapi('WindowParameterOverrides')

export const WindowParametersSchema = z
  .object({
    secondaryVolumePercent: z.number().int().openapi({ example: 50 }),
    goalVolumePercent: ByGoalSchema,
    baseOpenHours: ByGoalSchema,
    openMinutesPerAdjustedKg: z.number().int().openapi({ example: 1 }),
    maxOpenHours: z.number().int().openapi({ example: 72 }),
    openDurationHours: ByGoalSchema,
  })
  .openapi('WindowParameters')

export const SimulateActivityWindowsQuerySchema = z.object({
  muscleGroupSlug: z.string().optional().openapi({ example: 'back' }),
  from: z.string().optional().openapi({ example: '2025-03-03T03:00:00.000Z' }),
  to: z.string().optional().openapi({ example: '2025-03-10T03:00:00.000Z' }),
  parameters: WindowParameterOverridesSchema.optional(),
})

export const WindowRelationSchema = z
  .enum(['first', 'early', 'in_window', 'late'])
  .openapi('WindowRelation')

export const WindowOutcomeSchema = z
  .enum(['used', 'replaced', 'missed', 'open', 'pending'])
  .openapi('WindowOutcome')

export const SimulatedTrainingSchema = z
  .object({
    workoutId: z.string(),
    letter: z.string().openapi({ example: 'A' }),
    trainedAt: z.string().openapi({ example: '2025-03-03T10:00:00.000Z' }),
    goal: GoalSchema,
    volumeG: z.number().int().openapi({ example: 1200000 }),
    adjustedVolumeG: z.number().int().openapi({ example: 1200000 }),
    relation: WindowRelationSchema,
    window: z.object({
      opensAt: z.string().openapi({ example: '2025-03-05T22:00:00.000Z' }),
      closesAt: z.string().openapi({ example: '2025-03-07T22:00:00.000Z' }),
      outcome: WindowOutcomeSchema,
    }),
  })
  .openapi('SimulatedTraining')

export const WindowSummarySchema = z
  .object({
    windowsUsed: z.number().int(),
    windowsMissed: z.number().int(),
    trainedEarly: z.number().int(),
    usedPercent: z.number().int().nullable(),
  })
  .openapi('WindowSummary')

export const SimulatedGroupWindowsSchema = z
  .object({
    muscleGroup: z.object({
      slug: z.string().openapi({ example: 'back' }),
      name: z.string().openapi({ example: 'costas' }),
    }),
    summary: WindowSummarySchema,
    trainings: z.array(SimulatedTrainingSchema),
  })
  .openapi('SimulatedGroupWindows')

export const ActivityWindowSimulationSchema = z
  .object({
    parameters: WindowParametersSchema,
    from: z.string().nullable(),
    to: z.string().nullable(),
    groups: z.array(SimulatedGroupWindowsSchema),
  })
  .openapi('ActivityWindowSimulation')

export type SimulateActivityWindowsQuery = z.infer<typeof SimulateActivityWindowsQuerySchema>
export type ActivityWindowSimulation = z.infer<typeof ActivityWindowSimulationSchema>
