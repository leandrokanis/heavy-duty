import { z } from '@hono/zod-openapi'

const MAX_ENDPOINT_LENGTH = 2048
const MAX_KEY_LENGTH = 256
const BASE64URL = /^[A-Za-z0-9_-]+=*$/

export const PushKeySchema = z
  .object({
    configured: z.boolean().openapi({
      description: 'Whether the server holds the VAPID keys and can send push notices',
      example: true,
    }),
    publicKey: z.string().nullable().openapi({
      description: 'The public VAPID key, base64url, to subscribe with; null when not configured',
      example: '<VAPID_PUBLIC_KEY>',
    }),
  })
  .openapi('PushKey')

// The API later sends to the endpoint, so only https is taken: it narrows the reach of the requests.
const EndpointSchema = z
  .url({ protocol: /^https$/ })
  .max(MAX_ENDPOINT_LENGTH)
  .openapi({
    description: 'The https endpoint of the push service, which identifies the subscription',
    example: 'https://web.push.apple.com/QGuQyavXutnMH...',
  })

const KeySchema = z.string().min(1).max(MAX_KEY_LENGTH).regex(BASE64URL)

export const PushSubscriptionBodySchema = z
  .object({
    endpoint: EndpointSchema,
    keys: z.object({
      p256dh: KeySchema.openapi({ description: 'The public key of the browser, base64url' }),
      auth: KeySchema.openapi({ description: 'The auth secret of the browser, base64url' }),
    }),
  })
  .openapi('PushSubscriptionBody')

export const PushSubscriptionEndpointBodySchema = z
  .object({ endpoint: EndpointSchema })
  .openapi('PushSubscriptionEndpointBody')

export type PushKey = z.infer<typeof PushKeySchema>
export type PushSubscriptionBody = z.infer<typeof PushSubscriptionBodySchema>
