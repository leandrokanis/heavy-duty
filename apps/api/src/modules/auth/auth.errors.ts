import { DomainError } from '../../errors/domain-error.js'

export function enrollmentTokenInvalid(): DomainError {
  return new DomainError(
    'enrollment_token_invalid',
    'Link de cadastro inválido ou vencido. Gere outro link no servidor.',
    'invalid',
  )
}

export function enrollmentFailed(): DomainError {
  return new DomainError(
    'enrollment_failed',
    'Não foi possível criar a chave de acesso. Tente de novo.',
    'invalid',
  )
}

export function signInFailed(): DomainError {
  return new DomainError(
    'sign_in_failed',
    'Não foi possível entrar. Tente de novo.',
    'unauthenticated',
  )
}
