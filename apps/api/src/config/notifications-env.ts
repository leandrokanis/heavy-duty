import { readFileSync } from 'node:fs'
import type { Environment } from './env.js'

export type PushConfig = { publicKey: string; privateKey: string; subject: string }

export type NotificationsConfig = {
  push: PushConfig | null
  // Safe to log: they name variables, never their values.
  warnings: string[]
}

export type NotificationsConfigDeps = {
  appOrigin: string
  readFile?: (path: string) => string
}

const PUSH_OFF = 'push notices off'

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
  { appOrigin, readFile = (path) => readFileSync(path, 'utf8') }: NotificationsConfigDeps,
): NotificationsConfig {
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
