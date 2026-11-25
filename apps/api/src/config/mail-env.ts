import { readFileSync } from 'node:fs'
import { z } from 'zod'
import type { Environment } from './env.js'

export type SmtpAuth = { user: string; password: string }

export type MailConfig = {
  smtpHost: string
  smtpPort: number
  smtpAuth: SmtpAuth | null
  mailFrom: string
  mailTo: string
}

export type LoadedMailConfig = {
  mail: MailConfig | null
  // Safe to log: they name variables, never their values.
  warnings: string[]
}

export type SmtpTransportOptions = {
  host: string
  port: number
  secure: boolean
  connectionTimeout: number
  greetingTimeout: number
  socketTimeout: number
  auth?: { user: string; pass: string }
}

const DEFAULT_SMTP_PORT = 25
const IMPLICIT_TLS_PORT = 465
const CONNECTION_TIMEOUT_MS = 10_000
const SOCKET_TIMEOUT_MS = 30_000
const EMAIL_OFF = 'email notices off'

// Without any of them the API starts with the email channel off, see ADR-037.
const REQUIRED_VARIABLES = ['SMTP_HOST', 'MAIL_FROM', 'MAIL_TO'] as const

const MailEnvironmentSchema = z
  .object({
    SMTP_HOST: z.string().min(1),
    SMTP_PORT: z.coerce.number().int().min(1).max(65_535).default(DEFAULT_SMTP_PORT),
    SMTP_USER: z.string().min(1).optional(),
    SMTP_PASSWORD_FILE: z.string().min(1).optional(),
    MAIL_FROM: z.email(),
    MAIL_TO: z.email(),
  })
  .refine((env) => !(env.SMTP_USER && !env.SMTP_PASSWORD_FILE), {
    message: 'set SMTP_PASSWORD_FILE together with SMTP_USER',
    path: ['SMTP_PASSWORD_FILE'],
  })

function variablesOf(env: Environment): Environment {
  return Object.fromEntries(
    Object.entries(env)
      .map(([name, value]) => [name, value?.trim()] as const)
      .filter(([, value]) => value !== undefined && value.length > 0),
  )
}

// A wrong value turns the channel off with a warning, so a typo never stops the API (ADR-037).
export function loadMailConfig(
  env: Environment,
  readFile: (path: string) => string = (path) => readFileSync(path, 'utf8'),
): LoadedMailConfig {
  const variables = variablesOf(env)
  if (!REQUIRED_VARIABLES.every((name) => variables[name] !== undefined)) {
    return { mail: null, warnings: [] }
  }

  const parsed = MailEnvironmentSchema.safeParse(variables)
  if (!parsed.success) {
    return { mail: null, warnings: [`${EMAIL_OFF}: ${describeIssues(parsed.error)}`] }
  }
  const data = parsed.data
  const base = {
    smtpHost: data.SMTP_HOST,
    smtpPort: data.SMTP_PORT,
    mailFrom: data.MAIL_FROM,
    mailTo: data.MAIL_TO,
  }
  // The stack always mounts the password file, empty without the relay, so only SMTP_USER asks
  // for authentication.
  if (!data.SMTP_USER || !data.SMTP_PASSWORD_FILE) {
    return { mail: { ...base, smtpAuth: null }, warnings: [] }
  }

  let password: string
  try {
    password = readFile(data.SMTP_PASSWORD_FILE).trim()
  } catch {
    return {
      mail: null,
      warnings: [`${EMAIL_OFF}: could not read the file in SMTP_PASSWORD_FILE`],
    }
  }
  if (!password) {
    return { mail: null, warnings: [`${EMAIL_OFF}: the file in SMTP_PASSWORD_FILE is empty`] }
  }
  return { mail: { ...base, smtpAuth: { user: data.SMTP_USER, password } }, warnings: [] }
}

// Port 465 is SMTP over TLS; on other ports Nodemailer upgrades with STARTTLS when offered.
export function smtpTransportOptionsOf(config: MailConfig): SmtpTransportOptions {
  const options: SmtpTransportOptions = {
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpPort === IMPLICIT_TLS_PORT,
    connectionTimeout: CONNECTION_TIMEOUT_MS,
    greetingTimeout: CONNECTION_TIMEOUT_MS,
    socketTimeout: SOCKET_TIMEOUT_MS,
  }
  if (config.smtpAuth === null) return options
  return { ...options, auth: { user: config.smtpAuth.user, pass: config.smtpAuth.password } }
}

// Zod messages never carry the input value, so the warning does not leak an address.
function describeIssues(error: z.ZodError): string {
  return error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ')
}
