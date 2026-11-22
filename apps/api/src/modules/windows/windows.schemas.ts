import { z } from '@hono/zod-openapi'

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
