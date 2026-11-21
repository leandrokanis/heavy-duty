import { z } from '@hono/zod-openapi'

export const BackupRunStatusSchema = z.enum(['succeeded', 'failed']).openapi('BackupRunStatus')

export const BackupRunSchema = z
  .object({
    id: z.string().openapi({ example: '019aa5f0-0000-7000-8000-000000000301' }),
    startedAt: z.string().openapi({ example: '2026-11-21T06:00:00.000Z' }),
    finishedAt: z.string().openapi({ example: '2026-11-21T06:00:04.000Z' }),
    status: BackupRunStatusSchema,
    sizeBytes: z.number().int().nonnegative().nullable().openapi({ example: 98304 }),
    error: z
      .string()
      .nullable()
      .openapi({ example: 'offsite copy failed: repository does not exist' }),
  })
  .openapi('BackupRun')

export const BackupStatusSchema = z
  .object({
    latestRun: BackupRunSchema.nullable(),
    lastSuccessfulRun: BackupRunSchema.nullable(),
    recentRuns: z.array(BackupRunSchema),
  })
  .openapi('BackupStatus')

export const SystemStatusSchema = z.object({ backup: BackupStatusSchema }).openapi('SystemStatus')

export type BackupRun = z.infer<typeof BackupRunSchema>
export type SystemStatus = z.infer<typeof SystemStatusSchema>
