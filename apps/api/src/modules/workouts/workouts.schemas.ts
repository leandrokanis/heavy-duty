import { z } from '@hono/zod-openapi'
import { ExerciseKindSchema } from '../catalog/catalog.schemas.js'
import { GoalSchema } from '../programs/programs.schemas.js'

export const LoadSourceSchema = z.enum(['program', 'last_workout']).openapi('LoadSource')

export const TodayExerciseSchema = z
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
    restSeconds: z.number().int().openapi({ example: 90 }),
    plannedLoadG: z.number().int().openapi({ example: 40000 }),
    loadG: z.number().int().openapi({ example: 42500 }),
    loadSource: LoadSourceSchema,
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
