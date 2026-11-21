import { fileURLToPath } from 'node:url'
import { z } from 'zod'
import { DEFAULT_MCP_ALLOWED_HOSTS } from '../mcp/host-guard.js'

export type Environment = Record<string, string | undefined>

export type AppConfig = {
  nodeEnv: string
  port: number
  databasePath: string
  mcpAllowedHosts: readonly string[]
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
  MCP_ALLOWED_HOSTS: z.string().optional(),
})

function parseHostList(value: string | undefined): string[] | undefined {
  const hosts = value
    ?.split(',')
    .map((host) => host.trim())
    .filter((host) => host.length > 0)
  return hosts && hosts.length > 0 ? hosts : undefined
}

export function resolveDatabasePath(nodeEnv: string, databasePath: string | undefined): string {
  if (nodeEnv === 'production' && databasePath === undefined) {
    throw new Error('DATABASE_PATH is required when NODE_ENV is production')
  }
  return databasePath ?? DEV_DATABASE_PATH
}

export function loadConfig(env: Environment): AppConfig {
  const parsed = EnvironmentSchema.parse(env)

  return {
    nodeEnv: parsed.NODE_ENV,
    port: parsed.PORT,
    databasePath: resolveDatabasePath(parsed.NODE_ENV, parsed.DATABASE_PATH),
    mcpAllowedHosts: parseHostList(parsed.MCP_ALLOWED_HOSTS) ?? DEFAULT_MCP_ALLOWED_HOSTS,
  }
}
