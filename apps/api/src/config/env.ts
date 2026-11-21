import { fileURLToPath } from 'node:url'
import { z } from 'zod'

export type Environment = Record<string, string | undefined>

export type AppConfig = {
  nodeEnv: string
  port: number
  databasePath: string
}

const DEFAULT_PORT = 3001

// Resolves to the repository root from both src/config and dist/config.
const DEV_DATABASE_PATH = fileURLToPath(
  new URL('../../../../data/heavy-duty.dev.sqlite', import.meta.url),
)

const EnvironmentSchema = z.object({
  NODE_ENV: z.string().default('development'),
  PORT: z.coerce.number().int().positive().default(DEFAULT_PORT),
  DATABASE_PATH: z.string().min(1).optional(),
})

export function loadConfig(env: Environment): AppConfig {
  const parsed = EnvironmentSchema.parse(env)

  if (parsed.NODE_ENV === 'production' && parsed.DATABASE_PATH === undefined) {
    throw new Error('DATABASE_PATH is required when NODE_ENV is production')
  }

  return {
    nodeEnv: parsed.NODE_ENV,
    port: parsed.PORT,
    databasePath: parsed.DATABASE_PATH ?? DEV_DATABASE_PATH,
  }
}
