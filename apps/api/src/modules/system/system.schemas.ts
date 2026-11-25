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

export const NoticeFailureSchema = z
  .object({
    failedAt: z.string().openapi({ example: '2026-11-23T00:00:01.000Z' }),
    kind: z
      .enum(['window_open', 'window_close', 'level_drop'])
      .openapi({ example: 'window_close' }),
    letter: z.string().nullable().openapi({ example: 'B' }),
    error: z.string().nullable().openapi({ example: 'ECONNECTION' }),
  })
  .openapi('NoticeFailure')

export const NoticeChannelStatusSchema = z
  .object({
    channel: z.enum(['push', 'email']).openapi({ example: 'email' }),
    configured: z.boolean().openapi({ example: true }),
    lastSentAt: z.string().nullable().openapi({ example: '2026-11-22T00:00:01.000Z' }),
    recentFailures: z.array(NoticeFailureSchema),
  })
  .openapi('NoticeChannelStatus')

export const NoticesStatusSchema = z
  .object({ channels: z.array(NoticeChannelStatusSchema) })
  .openapi('NoticesStatus')

export const SystemStatusSchema = z
  .object({ backup: BackupStatusSchema, notices: NoticesStatusSchema })
  .openapi('SystemStatus')

export type BackupRun = z.infer<typeof BackupRunSchema>
export type NoticeChannelStatus = z.infer<typeof NoticeChannelStatusSchema>
export type SystemStatus = z.infer<typeof SystemStatusSchema>
