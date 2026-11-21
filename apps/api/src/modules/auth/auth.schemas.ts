import { z } from '@hono/zod-openapi'

export const SessionSchema = z
  .object({
    expiresAt: z.string().openapi({ example: '2026-12-21T12:00:00.000Z' }),
  })
  .openapi('AuthSession')

export const EnrollmentRequestSchema = z
  .object({
    token: z
      .string()
      .optional()
      .openapi({ description: 'Token from the enrollment link fragment' }),
    response: z
      .unknown()
      .optional()
      .openapi({ description: 'RegistrationResponseJSON from the browser' }),
  })
  .openapi('EnrollmentRequest')

export const SignInRequestSchema = z
  .object({
    response: z
      .unknown()
      .optional()
      .openapi({ description: 'AuthenticationResponseJSON from the browser' }),
  })
  .openapi('SignInRequest')

export const CeremonyOptionsSchema = z.record(z.string(), z.unknown()).openapi('CeremonyOptions', {
  description: 'PublicKeyCredential options JSON for @simplewebauthn/browser',
})
