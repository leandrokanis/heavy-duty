import { createApp } from '../app.js'
import type { Database } from '../db/connection.js'
import { runSeed } from '../db/seed.js'
import { addExercise } from '../modules/catalog/exercise.service.js'
import { addMuscle } from '../modules/catalog/muscle.service.js'
import { createTestDatabase } from './database.js'
import { createMcpAccessToken, withMcpAccessToken } from './mcp-auth.js'
import { createSessionCookie, withSessionCookie } from './session.js'

export const PROGRAM_TEST_START = new Date('2026-11-21T10:00:00.000Z')

export type TestClock = {
  now: () => Date
  advance: (ms: number) => void
}

export type ProgramTestApp = {
  app: ReturnType<typeof createApp>
  db: Database
  clock: TestClock
}

export function createTestClock(start: Date = PROGRAM_TEST_START): TestClock {
  let current = start.getTime()
  return {
    now: () => new Date(current),
    advance: (ms) => {
      current += ms
    },
  }
}

// Seeded catalog with 'supino-reto' (reps) and 'prancha' (time), behind a signed-in session and an MCP credential.
export function createProgramTestApp(options: { nodeEnv?: string } = {}): ProgramTestApp {
  const db = createTestDatabase()
  runSeed(db)
  addMuscle(db, { name: 'peitoral maior', muscleGroupSlug: 'chest' })
  addMuscle(db, { name: 'reto abdominal', muscleGroupSlug: 'abs' })
  addExercise(db, { name: 'Supino reto', kind: 'reps', primaryMuscleSlugs: ['peitoral-maior'] })
  addExercise(db, { name: 'Prancha', kind: 'time', primaryMuscleSlugs: ['reto-abdominal'] })

  const clock = createTestClock()
  const app = createApp({
    nodeEnv: options.nodeEnv ?? 'test',
    databaseHealth: () => true,
    db,
    now: clock.now,
  })
  const signedIn = withSessionCookie(app, createSessionCookie(db, clock.now()))
  const mcpToken = createMcpAccessToken(db, { now: clock.now() })
  return { app: withMcpAccessToken(signedIn, mcpToken), db, clock }
}
