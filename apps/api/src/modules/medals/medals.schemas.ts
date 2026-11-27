import { z } from '@hono/zod-openapi'

const MEDAL_CODES = [
  'first_record',
  'first_window',
  'weekly_goal',
  'week_streak_4',
  'level_10',
  'level_20',
  'volume_up_20',
  'full_period',
  'all_letters_in_week',
  'window_saved_at_end',
] as const

const MEDAL_ICONS = [
  'sparkle',
  'bolt',
  'target',
  'flame',
  'shield',
  'medal',
  'trophy',
  'star',
] as const

export const MedalSchema = z
  .object({
    code: z.enum(MEDAL_CODES).openapi({ example: 'level_10' }),
    name: z.string().nullable().openapi({ example: 'Nível 10' }),
    criterion: z.string().nullable().openapi({ example: 'Leve um grupo muscular ao nível 10.' }),
    icon: z.enum(MEDAL_ICONS).nullable().openapi({ example: 'shield' }),
    hidden: z.boolean().openapi({ example: false }),
    awardedAt: z.string().nullable().openapi({ example: '2026-12-03T21:40:00.000Z' }),
    subject: z
      .object({ slug: z.string(), name: z.string() })
      .nullable()
      .openapi({ example: { slug: 'chest', name: 'peito' } }),
    workoutId: z.string().nullable().openapi({ example: '0193a1b2-0000-7000-8000-000000000010' }),
  })
  .openapi('Medal')

export const MedalsSchema = z
  .object({
    now: z.string().openapi({ example: '2026-12-04T10:00:00.000Z' }),
    medals: z.array(MedalSchema),
  })
  .openapi('Medals')

export type Medals = z.infer<typeof MedalsSchema>
