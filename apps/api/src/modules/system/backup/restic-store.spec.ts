import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { BackupConfig } from '../../../config/backup-env.js'
import { OffsiteCopyError } from './offsite-store.js'
import { createResticStore } from './restic-store.js'

const INSECURE_DEV_PASSWORD = 'insecure-dev-only-password'

type FakeBehavior = { exitCode?: number; stderr?: string; hang?: boolean }

// Records argv, env and stdin next to itself, then behaves as behavior.json says.
const FAKE_RESTIC = `#!/usr/bin/env node
const fs = require('node:fs')
const path = require('node:path')
const folder = path.dirname(process.argv[1])
const behavior = JSON.parse(fs.readFileSync(path.join(folder, 'behavior.json'), 'utf8'))
fs.writeFileSync(path.join(folder, 'pid'), String(process.pid))
const chunks = []
process.stdin.on('data', (chunk) => chunks.push(chunk))
process.stdin.on('end', () => {
  fs.writeFileSync(path.join(folder, 'stdin'), Buffer.concat(chunks))
  fs.writeFileSync(
    path.join(folder, 'call.json'),
    JSON.stringify({ args: process.argv.slice(2), env: process.env }),
  )
  if (behavior.hang) {
    setInterval(() => {}, 1000)
    return
  }
  if (behavior.stderr) process.stderr.write(behavior.stderr)
  process.exitCode = behavior.exitCode ?? 0
})
`

function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

describe('Given a fake restic executable', () => {
  let folder: string
  let binary: string
  let snapshotPath: string

  function behave(behavior: FakeBehavior): void {
    writeFileSync(join(folder, 'behavior.json'), JSON.stringify(behavior))
  }

  function config(overrides: Partial<BackupConfig> = {}): BackupConfig {
    return {
      databasePath: join(folder, 'heavy-duty.sqlite'),
      resticRepository: join(folder, 'repository'),
      resticPassword: { kind: 'value', value: INSECURE_DEV_PASSWORD },
      resticBinary: binary,
      timeZone: 'America/Sao_Paulo',
      dailyAt: '03:00',
      ...overrides,
    }
  }

  function recordedCall(): { args: string[]; env: Record<string, string> } {
    return JSON.parse(readFileSync(join(folder, 'call.json'), 'utf8'))
  }

  beforeEach(() => {
    folder = mkdtempSync(join(tmpdir(), 'heavy-duty-restic-'))
    binary = join(folder, 'fake-restic.cjs')
    writeFileSync(binary, FAKE_RESTIC)
    chmodSync(binary, 0o755)
    snapshotPath = join(folder, 'snapshot.sqlite')
    writeFileSync(snapshotPath, 'SQLite format 3\0snapshot bytes')
    behave({})
  })

  afterEach(() => {
    rmSync(folder, { recursive: true, force: true })
  })

  describe('When the store sends a snapshot with the manual trigger', () => {
    it('Then should call restic backup with the stdin arguments and pipe the snapshot file to stdin', async () => {
      const store = createResticStore(config(), { env: { PATH: process.env.PATH } })

      await store.send(snapshotPath, 'manual')

      expect({
        args: recordedCall().args,
        stdin: readFileSync(join(folder, 'stdin')).equals(readFileSync(snapshotPath)),
      }).toEqual({
        args: [
          'backup',
          '--stdin',
          '--stdin-filename',
          'heavy-duty.sqlite',
          '--host',
          'heavy-duty',
          '--tag',
          'manual',
          '--json',
        ],
        stdin: true,
      })
    })
  })

  describe('When the store sends a snapshot from a process environment with an unrelated secret', () => {
    it('Then the child environment should keep PATH, HOME, TMPDIR and the restic variables, without the unrelated secret', async () => {
      const store = createResticStore(config(), {
        env: {
          PATH: process.env.PATH,
          HOME: folder,
          TMPDIR: folder,
          RESTIC_CACHE_DIR: join(folder, 'cache'),
          UNRELATED_SECRET: 'must-not-reach-restic',
        },
      })

      await store.send(snapshotPath, 'scheduled')

      const { env } = recordedCall()
      expect({
        keys: Object.keys(env)
          .filter((key) => !['PWD', 'SHLVL', '_'].includes(key))
          .sort(),
        repository: env.RESTIC_REPOSITORY,
        password: env.RESTIC_PASSWORD,
      }).toEqual({
        keys: [
          'HOME',
          'PATH',
          'RESTIC_CACHE_DIR',
          'RESTIC_PASSWORD',
          'RESTIC_REPOSITORY',
          'TMPDIR',
        ],
        repository: join(folder, 'repository'),
        password: INSECURE_DEV_PASSWORD,
      })
    })
  })

  describe('When restic exits with a non-zero code', () => {
    it('Then should reject with an OffsiteCopyError carrying the last stderr line', async () => {
      behave({
        exitCode: 1,
        stderr: 'reading repository config\nFatal: wrong password or no key found\n\n',
      })
      const store = createResticStore(config(), { env: { PATH: process.env.PATH } })

      const sent = store.send(snapshotPath, 'manual')

      await expect(sent).rejects.toEqual(
        new OffsiteCopyError('Fatal: wrong password or no key found'),
      )
    })
  })

  describe('When the restic binary does not exist', () => {
    it("Then should reject with an OffsiteCopyError 'backup tool not found'", async () => {
      const store = createResticStore(config({ resticBinary: join(folder, 'missing-restic') }), {
        env: { PATH: process.env.PATH },
      })

      const sent = store.send(snapshotPath, 'manual')

      await expect(sent).rejects.toEqual(new OffsiteCopyError('backup tool not found'))
    })
  })

  describe('When restic runs past the time limit', () => {
    it("Then should reject with an OffsiteCopyError 'backup tool timed out' after the child process ends", async () => {
      behave({ hang: true })
      const store = createResticStore(config(), {
        env: { PATH: process.env.PATH },
        timeoutMs: 1000,
      })

      const sent = store.send(snapshotPath, 'manual')

      await expect(sent).rejects.toEqual(new OffsiteCopyError('backup tool timed out'))
      const pid = Number(readFileSync(join(folder, 'pid'), 'utf8'))
      expect(isAlive(pid)).toBe(false)
    })
  })
})
