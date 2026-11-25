import { z } from '@hono/zod-openapi'

export const EmailNoticesInputSchema = z
  .object({
    enabled: z.boolean().openapi({ example: true }),
  })
  .openapi('EmailNoticesInput')

export const EmailNoticesSchema = z
  .object({
    emailEnabled: z.boolean().openapi({ example: true }),
    updatedAt: z.string().openapi({ example: '2026-11-25T12:00:00.000Z' }),
  })
  .openapi('EmailNotices')

export type EmailNoticesInput = z.infer<typeof EmailNoticesInputSchema>
export type EmailNotices = z.infer<typeof EmailNoticesSchema>
