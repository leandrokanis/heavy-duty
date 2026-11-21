import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { loadConfig } from './env.js'

describe('Given NODE_ENV production without DATABASE_PATH', () => {
  const env = { NODE_ENV: 'production' }

  describe('When the configuration is loaded', () => {
    it('Then should fail naming DATABASE_PATH', () => {
      expect(() => loadConfig(env)).toThrow(/DATABASE_PATH/)
    })
  })
})

describe('Given an environment without PORT and DATABASE_PATH outside production', () => {
  const env = { NODE_ENV: 'development' }

  describe('When the configuration is loaded', () => {
    it('Then should use port 3001 and the development database in the repository data folder', () => {
      const expectedPath = fileURLToPath(
        new URL('../../../../data/heavy-duty.dev.sqlite', import.meta.url),
      )

      expect(loadConfig(env)).toEqual({
        nodeEnv: 'development',
        port: 3001,
        databasePath: expectedPath,
        mcpAllowedHosts: ['localhost', '127.0.0.1', '[::1]'],
      })
    })
  })
})

describe('Given MCP_ALLOWED_HOSTS with a comma separated list', () => {
  const env = { NODE_ENV: 'development', MCP_ALLOWED_HOSTS: ' heavy-duty.example , localhost ,' }

  describe('When the configuration is loaded', () => {
    it('Then should return the trimmed hostnames without empty entries', () => {
      expect(loadConfig(env).mcpAllowedHosts).toEqual(['heavy-duty.example', 'localhost'])
    })
  })
})
