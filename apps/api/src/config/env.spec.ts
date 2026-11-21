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
        appOrigin: 'http://localhost:8080',
        rpId: 'localhost',
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

describe('Given NODE_ENV production with DATABASE_PATH and without APP_ORIGIN', () => {
  const env = { NODE_ENV: 'production', DATABASE_PATH: '/data/heavy-duty.sqlite' }

  describe('When the configuration is loaded', () => {
    it('Then should fail naming APP_ORIGIN', () => {
      expect(() => loadConfig(env)).toThrow(/APP_ORIGIN/)
    })
  })
})

describe('Given NODE_ENV production with an http APP_ORIGIN', () => {
  const env = {
    NODE_ENV: 'production',
    DATABASE_PATH: '/data/heavy-duty.sqlite',
    APP_ORIGIN: 'http://heavy-duty.example',
  }

  describe('When the configuration is loaded', () => {
    it('Then should fail naming APP_ORIGIN and https', () => {
      expect(() => loadConfig(env)).toThrow(/APP_ORIGIN.*https/)
    })
  })
})

describe('Given APP_ORIGIN with a trailing slash', () => {
  const env = {
    NODE_ENV: 'production',
    DATABASE_PATH: '/data/heavy-duty.sqlite',
    APP_ORIGIN: 'https://treino.example/',
  }

  describe('When the configuration is loaded', () => {
    it('Then should normalize the origin and use the hostname as the RP ID', () => {
      const config = loadConfig(env)

      expect({ appOrigin: config.appOrigin, rpId: config.rpId }).toEqual({
        appOrigin: 'https://treino.example',
        rpId: 'treino.example',
      })
    })
  })
})

describe('Given APP_ORIGIN with a port outside production', () => {
  const env = { NODE_ENV: 'development', APP_ORIGIN: 'http://localhost:3100' }

  describe('When the configuration is loaded', () => {
    it('Then should keep the port in the origin and leave it out of the RP ID', () => {
      const config = loadConfig(env)

      expect({ appOrigin: config.appOrigin, rpId: config.rpId }).toEqual({
        appOrigin: 'http://localhost:3100',
        rpId: 'localhost',
      })
    })
  })
})

describe('Given NODE_ENV production with an empty APP_ORIGIN, as compose.prod.yaml passes without .env', () => {
  const env = { NODE_ENV: 'production', DATABASE_PATH: '/data/heavy-duty.sqlite', APP_ORIGIN: '' }

  describe('When the configuration is loaded', () => {
    it('Then should fail naming APP_ORIGIN', () => {
      expect(() => loadConfig(env)).toThrow(/APP_ORIGIN/)
    })
  })
})
