import { OpenAPIHono, z } from '@hono/zod-openapi'
import type { ErrorHandler, NotFoundHandler } from 'hono'

export const ErrorSchema = z
  .object({
    code: z.string().openapi({ example: 'not_found' }),
    message: z.string().openapi({ example: 'recurso não encontrado' }),
  })
  .openapi('Error')

export type ErrorBody = z.infer<typeof ErrorSchema>

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

export const handleError: ErrorHandler = (error, c) => {
  console.error('Unhandled request error:', error)
  return c.json<ErrorBody>({ code: 'internal_error', message: 'erro interno do servidor' }, 500)
}
