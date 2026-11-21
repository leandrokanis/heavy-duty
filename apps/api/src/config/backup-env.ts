import { z } from 'zod'
import { type Environment, resolveDatabasePath } from './env.js'

export type ResticPassword = { kind: 'file'; path: string } | { kind: 'value'; value: string }

export type BackupConfig = {
  databasePath: string
  resticRepository: string
  resticPassword: ResticPassword
  resticBinary: string
  timeZone: string
  dailyAt: string
}

const DEFAULT_RESTIC_BINARY = 'restic'
const DEFAULT_TIME_ZONE = 'America/Sao_Paulo'
const DEFAULT_DAILY_AT = '03:00'
const DAILY_AT_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/

function isTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value })
    return true
  } catch {
    return false
  }
}

const BackupEnvironmentSchema = z
  .object({
    NODE_ENV: z.string().default('development'),
    DATABASE_PATH: z.string().min(1).optional(),
    RESTIC_REPOSITORY: z.string().min(1),
    RESTIC_PASSWORD: z.string().min(1).optional(),
    RESTIC_PASSWORD_FILE: z.string().min(1).optional(),
    RESTIC_BINARY: z.string().min(1).default(DEFAULT_RESTIC_BINARY),
    BACKUP_TIME_ZONE: z
      .string()
      .refine(isTimeZone, { message: 'expected an IANA time zone such as America/Sao_Paulo' })
      .default(DEFAULT_TIME_ZONE),
    BACKUP_DAILY_AT: z
      .string()
      .regex(DAILY_AT_PATTERN, { message: 'expected a local time in HH:mm, such as 03:00' })
      .default(DEFAULT_DAILY_AT),
  })
  .refine((env) => !(env.RESTIC_PASSWORD && env.RESTIC_PASSWORD_FILE), {
    message: 'set only one of RESTIC_PASSWORD and RESTIC_PASSWORD_FILE',
    path: ['RESTIC_PASSWORD'],
  })
  .refine((env) => env.RESTIC_PASSWORD || env.RESTIC_PASSWORD_FILE, {
    message: 'set RESTIC_PASSWORD_FILE or, for development only, RESTIC_PASSWORD',
    path: ['RESTIC_PASSWORD_FILE'],
  })

export function loadBackupConfig(env: Environment): BackupConfig {
  const parsed = BackupEnvironmentSchema.safeParse(env)
  if (!parsed.success) {
    throw new Error(`Invalid backup configuration: ${describeIssues(parsed.error)}`)
  }
  const data = parsed.data
  return {
    databasePath: resolveDatabasePath(data.NODE_ENV, data.DATABASE_PATH),
    resticRepository: data.RESTIC_REPOSITORY,
    resticPassword: data.RESTIC_PASSWORD_FILE
      ? { kind: 'file', path: data.RESTIC_PASSWORD_FILE }
      : { kind: 'value', value: data.RESTIC_PASSWORD as string },
    resticBinary: data.RESTIC_BINARY,
    timeZone: data.BACKUP_TIME_ZONE,
    dailyAt: data.BACKUP_DAILY_AT,
  }
}

function describeIssues(error: z.ZodError): string {
  return error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ')
}
