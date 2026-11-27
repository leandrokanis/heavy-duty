import { z } from '@hono/zod-openapi'

export const WeeklyDigestQuerySchema = z.object({
  at: z
    .string()
    .optional()
    .describe(
      'A UTC instant in ISO 8601 inside the week of the period to show; the last week that ended when absent',
    ),
})

export const WeeklyDigestSchema = z.object({
  now: z.string(),
  weekStartsAt: z.string(),
  weekEndsAt: z.string(),
  ended: z.boolean(),
  subject: z.string(),
  weeklyGoal: z.number().int().nullable(),
  windowsUsed: z.number().int(),
  windowsMissed: z.number().int(),
  weekPoints: z.number().int(),
  weekStreak: z.number().int(),
  levels: z.array(
    z.object({
      muscleGroup: z.object({ slug: z.string(), name: z.string() }),
      from: z.number().int(),
      to: z.number().int(),
    }),
  ),
  records: z.array(z.string()),
  medals: z.array(z.string()),
})

export type WeeklyDigestQuery = z.infer<typeof WeeklyDigestQuerySchema>
export type WeeklyDigestView = z.infer<typeof WeeklyDigestSchema>
