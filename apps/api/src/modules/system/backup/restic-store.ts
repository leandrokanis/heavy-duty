import { spawn } from 'node:child_process'
import { createReadStream } from 'node:fs'
import type { BackupConfig } from '../../../config/backup-env.js'
import type { Environment } from '../../../config/env.js'
import { type BackupTrigger, OffsiteCopyError, type OffsiteStore } from './offsite-store.js'

export type ResticStoreOptions = {
  env?: Environment
  timeoutMs?: number
}

export const RESTIC_TIMEOUT_MS = 30 * 60 * 1000
const KILL_GRACE_MS = 5000

const INHERITED_VARIABLES = ['PATH', 'HOME', 'TMPDIR']
const CONFIGURED_VARIABLES = [
  'RESTIC_REPOSITORY',
  'RESTIC_PASSWORD',
  'RESTIC_PASSWORD_FILE',
  'RESTIC_BINARY',
]
const MAX_STDERR_CHARACTERS = 64 * 1024
const STDIN_FILE_NAME = 'heavy-duty.sqlite'
const HOST = 'heavy-duty'

export function createResticStore(
  config: BackupConfig,
  options: ResticStoreOptions = {},
): OffsiteStore {
  const baseEnv = options.env ?? process.env
  const timeoutMs = options.timeoutMs ?? RESTIC_TIMEOUT_MS
  return {
    send: (snapshotPath, trigger) =>
      new Promise<void>((resolve, reject) => {
        const child = spawn(config.resticBinary, backupArguments(trigger), {
          env: childEnvironment(config, baseEnv),
          stdio: ['pipe', 'ignore', 'pipe'],
        })
        let stderr = ''
        child.stderr.setEncoding('utf8')
        child.stderr.on('data', (chunk: string) => {
          stderr = (stderr + chunk).slice(-MAX_STDERR_CHARACTERS)
        })
        let settled = false
        let timedOut = false
        let killTimer: NodeJS.Timeout | undefined
        const fail = (detail: string) => {
          if (settled) return
          settled = true
          reject(new OffsiteCopyError(detail))
        }
        // SIGTERM lets restic release its repository lock; SIGKILL covers a hung process.
        const timeoutTimer = setTimeout(() => {
          timedOut = true
          child.kill('SIGTERM')
          killTimer = setTimeout(() => child.kill('SIGKILL'), KILL_GRACE_MS)
        }, timeoutMs)
        // restic may exit before reading all of stdin; the exit code reports why.
        child.stdin.on('error', () => {})
        const input = createReadStream(snapshotPath)
        input.on('error', () => {
          fail('snapshot could not be read')
          child.kill('SIGTERM')
        })
        input.pipe(child.stdin)
        child.on('error', (error: NodeJS.ErrnoException) => {
          clearTimeout(timeoutTimer)
          input.destroy()
          fail(error.code === 'ENOENT' ? 'backup tool not found' : 'backup tool failed to start')
        })
        child.on('close', (code) => {
          clearTimeout(timeoutTimer)
          clearTimeout(killTimer)
          if (timedOut) {
            fail('backup tool timed out')
            return
          }
          if (code === 0 && !settled) {
            settled = true
            resolve()
            return
          }
          fail(lastLine(stderr) || `backup tool exited with code ${code}`)
        })
      }),
  }
}

// Only what restic needs reaches the child, so unrelated secrets stay in this process.
function childEnvironment(config: BackupConfig, baseEnv: Environment): Environment {
  const env: Environment = {}
  for (const [key, value] of Object.entries(baseEnv)) {
    const inherited =
      INHERITED_VARIABLES.includes(key) ||
      (key.startsWith('RESTIC_') && !CONFIGURED_VARIABLES.includes(key))
    if (inherited && value !== undefined) env[key] = value
  }
  env.RESTIC_REPOSITORY = config.resticRepository
  if (config.resticPassword.kind === 'file') {
    env.RESTIC_PASSWORD_FILE = config.resticPassword.path
  } else {
    env.RESTIC_PASSWORD = config.resticPassword.value
  }
  return env
}

function backupArguments(trigger: BackupTrigger): string[] {
  return [
    'backup',
    '--stdin',
    '--stdin-filename',
    STDIN_FILE_NAME,
    '--host',
    HOST,
    '--tag',
    trigger,
    '--json',
  ]
}

function lastLine(output: string): string {
  const lines = output.split(/\r?\n/).filter((line) => line.trim().length > 0)
  return lines.at(-1)?.trim() ?? ''
}
