import type { Context, ErrorHandler } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { DomainError } from '../../errors/domain-error.js'
import { type ErrorBody, handleError } from '../../http/errors.js'
import { REGISTER_PATH, TOKEN_PATH } from './oauth-endpoints.js'

export type OAuthErrorCode =
  | 'invalid_request'
  | 'invalid_client'
  | 'invalid_grant'
  | 'invalid_target'
  | 'unsupported_grant_type'
  | 'invalid_redirect_uri'
  | 'invalid_client_metadata'

export type OAuthErrorStatus = 400 | 401 | 413

export type OAuthErrorBody = {
  error: OAuthErrorCode
  error_description: string
}

// RFC 6749 and RFC 7591 errors; error_description stays in ASCII English, as the RFCs require.
export class OAuthError extends Error {
  readonly error: OAuthErrorCode
  readonly status: OAuthErrorStatus

  constructor(error: OAuthErrorCode, description: string, status: OAuthErrorStatus = 400) {
    super(description)
    this.name = 'OAuthError'
    this.error = error
    this.status = status
  }
}

export function oauthErrorResponse(c: Context, error: OAuthError): Response {
  return c.json<OAuthErrorBody>(
    { error: error.error, error_description: error.message },
    error.status,
  )
}

export function requestBodyTooLarge(): OAuthError {
  return new OAuthError('invalid_request', 'request body is larger than 16 KiB', 413)
}

// Malformed JSON surfaces as an HTTPException 400 from the validator, before the route hook.
export const handleOAuthError: ErrorHandler = (error, c) => {
  if (error instanceof OAuthError) {
    return oauthErrorResponse(c, error)
  }
  if (error instanceof HTTPException && error.status === 400) {
    if (c.req.path === REGISTER_PATH) {
      return oauthErrorResponse(c, new OAuthError('invalid_client_metadata', 'body is not JSON'))
    }
    if (c.req.path === TOKEN_PATH) {
      return oauthErrorResponse(c, new OAuthError('invalid_request', 'body could not be parsed'))
    }
    return c.json<ErrorBody>({ code: 'invalid_request', message: 'requisição inválida' }, 400)
  }
  return handleError(error, c)
}

export function oauthClientUnknown(): DomainError {
  return new DomainError(
    'oauth_client_unknown',
    'Cliente do MCP desconhecido. Conecte o cliente de novo.',
    'invalid',
  )
}

export function oauthRedirectUriInvalid(): DomainError {
  return new DomainError(
    'oauth_redirect_uri_invalid',
    'Endereço de retorno não registrado por este cliente do MCP.',
    'invalid',
  )
}
