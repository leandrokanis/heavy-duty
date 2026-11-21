import { z } from '@hono/zod-openapi'
import { ExerciseKindSchema } from '../catalog/catalog.schemas.js'

export const GoalSchema = z.enum(['strength', 'hypertrophy', 'endurance']).openapi('Goal')

export const PlannedExerciseSchema = z
  .object({
    exercise: z.object({
      id: z.string().openapi({ example: '0193a1b2-0000-7000-8000-000000000201' }),
      slug: z.string().openapi({ example: 'supino-reto' }),
      name: z.string().openapi({ example: 'Supino reto' }),
      kind: ExerciseKindSchema,
    }),
    sets: z.number().int().openapi({ example: 3 }),
    targetReps: z.number().int().nullable().openapi({ example: 10 }),
    targetSeconds: z.number().int().nullable().openapi({ example: null }),
    loadG: z.number().int().openapi({ example: 40000 }),
    restSeconds: z.number().int().openapi({ example: 90 }),
  })
  .openapi('PlannedExercise')

export const ProgramDaySchema = z
  .object({
    letter: z.string().openapi({ example: 'A' }),
    label: z.string().nullable().openapi({ example: 'Superior' }),
    exercises: z.array(PlannedExerciseSchema),
  })
  .openapi('ProgramDay')

export const ProgramSchema = z
  .object({
    id: z.string().openapi({ example: '0193a1b2-0000-7000-8000-000000000301' }),
    name: z.string().openapi({ example: 'Programa 1' }),
    goal: GoalSchema,
    isActive: z.boolean().openapi({ example: true }),
    createdAt: z.string().openapi({ example: '2026-11-21T10:00:00.000Z' }),
    days: z.array(ProgramDaySchema),
  })
  .openapi('Program')

export const ProgramListSchema = z
  .object({ programs: z.array(ProgramSchema) })
  .openapi('ProgramList')

// Fields are optional free strings so the service, not the schema, refuses a
// missing or invalid value with the same domain error on HTTP and MCP.
export const CreateProgramInputSchema = z
  .object({
    name: z.string().optional().openapi({ example: 'Programa 1' }),
    goal: z.string().optional().openapi({ example: 'hypertrophy' }),
  })
  .openapi('CreateProgramInput')

// A null label is the label the client read back from a day without one.
export const AddProgramDayInputSchema = z
  .object({
    letter: z.string().optional().openapi({ example: 'A' }),
    label: z.string().nullable().optional().openapi({ example: 'Superior' }),
  })
  .openapi('AddProgramDayInput')

// Measures are plain numbers so the service refuses zero, negative, fraction and
// unsafe integers; null targets are what the client read back from the other kind.
export const AddPlannedExerciseInputSchema = z
  .object({
    exerciseSlug: z.string().optional().openapi({ example: 'supino-reto' }),
    sets: z.number().optional().openapi({ example: 3 }),
    targetReps: z.number().nullable().optional().openapi({ example: 10 }),
    targetSeconds: z.number().nullable().optional().openapi({ example: null }),
    loadG: z.number().optional().openapi({ example: 40000 }),
    restSeconds: z.number().optional().openapi({ example: 90 }),
  })
  .openapi('AddPlannedExerciseInput')

export const ProgramIdParamsSchema = z.object({
  programId: z.string().openapi({
    param: { name: 'programId', in: 'path' },
    example: '0193a1b2-0000-7000-8000-000000000301',
  }),
})

export const ProgramDayParamsSchema = ProgramIdParamsSchema.extend({
  letter: z.string().openapi({ param: { name: 'letter', in: 'path' }, example: 'A' }),
})

export type Goal = z.infer<typeof GoalSchema>
export type PlannedExercise = z.infer<typeof PlannedExerciseSchema>
export type ProgramDay = z.infer<typeof ProgramDaySchema>
export type Program = z.infer<typeof ProgramSchema>
export type CreateProgramInput = z.infer<typeof CreateProgramInputSchema>
export type AddProgramDayInput = z.infer<typeof AddProgramDayInputSchema>
export type AddPlannedExerciseInput = z.infer<typeof AddPlannedExerciseInputSchema>
