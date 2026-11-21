import { fileURLToPath } from 'node:url'
import { z } from 'zod'
import { DEFAULT_MCP_ALLOWED_HOSTS } from '../mcp/host-guard.js'

export type Environment = Record<string, string | undefined>

export type AppConfig = {
  nodeEnv: string
  port: number
  databasePath: string
  mcpAllowedHosts: readonly string[]
  appOrigin: string
  rpId: string
}

export type AppOrigin = {
  appOrigin: string
  rpId: string
}

const DEFAULT_PORT = 3001
const DEV_APP_ORIGIN = 'http://localhost:8080'

// Resolves to the repository root from both src/config and dist/config.
const DEV_DATABASE_PATH = fileURLToPath(
  new URL('../../../../data/heavy-duty.dev.sqlite', import.meta.url),
)

const EnvironmentSchema = z.object({
  NODE_ENV: z.string().default('development'),
  PORT: z.coerce.number().int().positive().default(DEFAULT_PORT),
  DATABASE_PATH: z.string().min(1).optional(),
  MCP_ALLOWED_HOSTS: z.string().optional(),
  APP_ORIGIN: z.string().min(1).optional(),
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

// The WebAuthn RP ID is a domain without port, so it comes from the hostname.
export function resolveAppOrigin(nodeEnv: string, appOrigin: string | undefined): AppOrigin {
  if (nodeEnv === 'production' && appOrigin === undefined) {
    throw new Error('APP_ORIGIN is required when NODE_ENV is production')
  }
  const url = new URL(appOrigin ?? DEV_APP_ORIGIN)
  if (nodeEnv === 'production' && url.protocol !== 'https:') {
    throw new Error('APP_ORIGIN must use https when NODE_ENV is production')
  }
  return { appOrigin: url.origin, rpId: url.hostname }
}

export function loadConfig(env: Environment): AppConfig {
  const parsed = EnvironmentSchema.parse(env)

  return {
    nodeEnv: parsed.NODE_ENV,
    port: parsed.PORT,
    databasePath: resolveDatabasePath(parsed.NODE_ENV, parsed.DATABASE_PATH),
    mcpAllowedHosts: parseHostList(parsed.MCP_ALLOWED_HOSTS) ?? DEFAULT_MCP_ALLOWED_HOSTS,
    ...resolveAppOrigin(parsed.NODE_ENV, parsed.APP_ORIGIN),
  }
}
