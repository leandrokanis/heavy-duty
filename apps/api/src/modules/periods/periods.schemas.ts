import { z } from '@hono/zod-openapi'
import { TierSchema } from '../windows/windows.schemas.js'

const WindowsTallyShape = {
  windowsUsed: z.number().int().openapi({ example: 17 }),
  windowsMissed: z.number().int().openapi({ example: 8 }),
  usedPercent: z.number().int().nullable().openapi({ example: 68 }),
}

export const PeriodGroupSchema = z
  .object({
    muscleGroup: z.object({
      slug: z.string().openapi({ example: 'chest' }),
      name: z.string().openapi({ example: 'peito' }),
    }),
    ...WindowsTallyShape,
  })
  .openapi('PeriodGroup')

export const PeriodWeekSchema = z
  .object({
    week: z.number().int().openapi({ example: 1 }),
    from: z.string().openapi({ example: '2026-11-23T03:00:00.000Z' }),
    to: z.string().openapi({ example: '2026-11-30T03:00:00.000Z' }),
    weeklyGoal: z.number().int().nullable().openapi({ example: 6 }),
    windowsUsed: z.number().int().openapi({ example: 7 }),
    points: z.number().int().openapi({ example: 420 }),
    status: z
      .enum(['met', 'missed', 'protected', 'neutral', 'pending'])
      .openapi({ example: 'met' }),
  })
  .openapi('PeriodWeek')
export const RankedWorkoutSchema = z
  .object({
    workoutId: z.string().openapi({ example: '019d7f2e-8c41-7a3b-9f10-4c2d8e6a1b23' }),
    letter: z.string().openapi({ example: 'A' }),
    startedAt: z.string().openapi({ example: '2026-11-25T10:00:00.000Z' }),
    points: z.number().int().openapi({ example: 240 }),
    position: z.number().int().openapi({ example: 2 }),
  })
  .openapi('RankedWorkout')

export const CurrentPeriodSchema = z
  .object({
    now: z.string().openapi({ example: '2026-11-27T12:00:00.000Z' }),
    number: z.number().int().openapi({ example: 1 }),
    startsAt: z.string().openapi({ example: '2026-11-23T03:00:00.000Z' }),
    endsAt: z.string().openapi({ example: '2027-02-15T03:00:00.000Z' }),
    week: z.number().int().openapi({ example: 1 }),
    weekCount: z.number().int().openapi({ example: 12 }),
    intention: z
      .string()
      .nullable()
      .openapi({ example: 'Treinar três vezes por semana até o fim do ano.' }),
    windows: z
      .object({
        ...WindowsTallyShape,
        targetPercent: z.number().int().openapi({ example: 70 }),
      })
      .openapi('PeriodWindows'),
    volume: z
      .object({
        baselineVolumeG: z.number().int().nullable().openapi({ example: 10_000_000 }),
        lastWeekVolumeG: z.number().int().nullable().openapi({ example: 11_200_000 }),
        changePercent: z.number().int().nullable().openapi({ example: 12 }),
        targetPercent: z.number().int().openapi({ example: 20 }),
      })
      .openapi('PeriodVolume'),
    groups: z.array(PeriodGroupSchema),
    weeks: z.array(PeriodWeekSchema),
    weekStreak: z
      .object({
        weeks: z.number().int().openapi({ example: 3 }),
        protectionUsed: z.boolean().openapi({ example: false }),
      })
      .openapi('WeekStreak'),
    ranking: z.array(RankedWorkoutSchema),
  })
  .openapi('CurrentPeriod')

export type CurrentPeriod = z.infer<typeof CurrentPeriodSchema>

// intention stays a plain optional string so the service refuses it with its own code.
export const PeriodIntentionInputSchema = z.object({
  intention: z
    .string()
    .optional()
    .openapi({ example: 'Treinar três vezes por semana até o fim do ano.' }),
})

export type PeriodIntentionInput = z.infer<typeof PeriodIntentionInputSchema>

export const GroupSnapshotSchema = z
  .object({
    muscleGroup: z.object({
      slug: z.string().openapi({ example: 'chest' }),
      name: z.string().openapi({ example: 'peito' }),
    }),
    level: z.number().int().openapi({ example: 12 }),
    points: z.number().int().openapi({ example: 31 }),
    bestLevel: z.number().int().openapi({ example: 13 }),
    tier: TierSchema,
    windowState: z.enum(['resting', 'open', 'cooling', 'none']).openapi({ example: 'open' }),
    ...WindowsTallyShape,
  })
  .openapi('GroupSnapshot')

export const PeriodSnapshotSchema = z
  .object({
    ...WindowsTallyShape,
    points: z.number().int().openapi({ example: 3120 }),
    bestWorkoutPoints: z.number().int().openapi({ example: 240 }),
    weekStreak: z.number().int().openapi({ example: 5 }),
    groups: z.array(GroupSnapshotSchema),
  })
  .openapi('PeriodSnapshot')

export const PeriodListItemSchema = z
  .object({
    number: z.number().int().openapi({ example: 1 }),
    startsAt: z.string().openapi({ example: '2026-11-23T03:00:00.000Z' }),
    endsAt: z.string().openapi({ example: '2027-02-15T03:00:00.000Z' }),
    intention: z
      .string()
      .nullable()
      .openapi({ example: 'Treinar três vezes por semana até o fim do ano.' }),
    frozenAt: z.string().nullable().openapi({ example: '2027-02-15T03:00:41.000Z' }),
    snapshot: PeriodSnapshotSchema.nullable(),
  })
  .openapi('PeriodListItem')

export const PeriodListSchema = z
  .object({
    now: z.string().openapi({ example: '2027-02-20T12:00:00.000Z' }),
    periods: z.array(PeriodListItemSchema),
  })
  .openapi('PeriodList')

export type PeriodList = z.infer<typeof PeriodListSchema>
