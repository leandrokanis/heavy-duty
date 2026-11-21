import { OpenAPIHono, z } from '@hono/zod-openapi'
import type { ErrorHandler, NotFoundHandler } from 'hono'
import { DomainError, type DomainErrorKind } from '../errors/domain-error.js'

export const ErrorSchema = z
  .object({
    code: z.string().openapi({ example: 'not_found' }),
    message: z.string().openapi({ example: 'recurso não encontrado' }),
  })
  .openapi('Error')

export type ErrorBody = z.infer<typeof ErrorSchema>

export const INTERNAL_ERROR_BODY: ErrorBody = {
  code: 'internal_error',
  message: 'erro interno do servidor',
}

export const UNAUTHENTICATED_BODY: ErrorBody = {
  code: 'unauthenticated',
  message: 'Entre com a sua chave de acesso.',
}

export const UNAUTHENTICATED_RESPONSE = {
  description: 'No valid access session cookie',
  content: { 'application/json': { schema: ErrorSchema } },
} as const

export function createRouter(): OpenAPIHono {
  return new OpenAPIHono({
    defaultHook: (result, c) => {
      if (!result.success) {
        return c.json<ErrorBody>({ code: 'invalid_request', message: 'requisição inválida' }, 400)
      }
    },
  })
}

export const handleNotFound: NotFoundHandler = (c) =>
  c.json<ErrorBody>({ code: 'not_found', message: 'recurso não encontrado' }, 404)

const DOMAIN_ERROR_STATUS = {
  invalid: 400,
  not_found_reference: 422,
  conflict: 409,
  unauthenticated: 401,
} as const satisfies Record<DomainErrorKind, number>

export const handleError: ErrorHandler = (error, c) => {
  if (error instanceof DomainError) {
    return c.json<ErrorBody>(
      { code: error.code, message: error.message },
      DOMAIN_ERROR_STATUS[error.kind],
    )
  }
  console.error('Unhandled request error:', error)
  return c.json<ErrorBody>(INTERNAL_ERROR_BODY, 500)
}
