import { readFileSync } from 'node:fs'
import type { Environment } from './env.js'

export type PushConfig = { publicKey: string; privateKey: string; subject: string }

export type NotificationsConfig = {
  push: PushConfig | null
  // The zone of the quiet hours and of the text of the notices (D81).
  timeZone: string
  // Safe to log: they name variables, never their values.
  warnings: string[]
}

export type NotificationsConfigDeps = {
  appOrigin: string
  readFile?: (path: string) => string
}

const PUSH_OFF = 'push notices off'
export const DEFAULT_NOTICE_TIME_ZONE = 'America/Sao_Paulo'

function isTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value })
    return true
  } catch {
    return false
  }
}

// An unknown zone falls back to the default with a warning, so a typo never stops the API.
function timeZoneOf(env: Environment): { timeZone: string; warnings: string[] } {
  const value = variableOf(env, 'NOTICE_TIME_ZONE')
  if (value === undefined) return { timeZone: DEFAULT_NOTICE_TIME_ZONE, warnings: [] }
  if (isTimeZone(value)) return { timeZone: value, warnings: [] }
  return {
    timeZone: DEFAULT_NOTICE_TIME_ZONE,
    warnings: [`NOTICE_TIME_ZONE is not an IANA time zone; using ${DEFAULT_NOTICE_TIME_ZONE}`],
  }
}

function variableOf(env: Environment, name: string): string | undefined {
  const value = env[name]?.trim()
  return value ? value : undefined
}

function readPrivateKey(
  path: string | undefined,
  readFile: (path: string) => string,
): { privateKey?: string; unreadable?: true } {
  if (path === undefined) return {}
  try {
    const privateKey = readFile(path).trim()
    return privateKey ? { privateKey } : {}
  } catch {
    return { unreadable: true }
  }
}

// Every variable is optional: without them the API starts with the push channel off (ADR-035).
export function loadNotificationsConfig(
  env: Environment,
  deps: NotificationsConfigDeps,
): NotificationsConfig {
  const zone = timeZoneOf(env)
  const push = loadPushConfig(env, deps)
  return {
    push: push.push,
    timeZone: zone.timeZone,
    warnings: [...push.warnings, ...zone.warnings],
  }
}

function loadPushConfig(
  env: Environment,
  { appOrigin, readFile = (path) => readFileSync(path, 'utf8') }: NotificationsConfigDeps,
): Pick<NotificationsConfig, 'push' | 'warnings'> {
  const publicKey = variableOf(env, 'VAPID_PUBLIC_KEY')
  const { privateKey, unreadable } = readPrivateKey(
    variableOf(env, 'VAPID_PRIVATE_KEY_FILE'),
    readFile,
  )

  if (unreadable) {
    return {
      push: null,
      warnings: [`${PUSH_OFF}: could not read the file in VAPID_PRIVATE_KEY_FILE`],
    }
  }
  if (publicKey === undefined && privateKey === undefined) return { push: null, warnings: [] }
  if (publicKey === undefined) {
    return { push: null, warnings: [`${PUSH_OFF}: set VAPID_PUBLIC_KEY`] }
  }
  if (privateKey === undefined) {
    return { push: null, warnings: [`${PUSH_OFF}: set VAPID_PRIVATE_KEY_FILE`] }
  }
  return {
    push: { publicKey, privateKey, subject: variableOf(env, 'VAPID_SUBJECT') ?? appOrigin },
    warnings: [],
  }
}
