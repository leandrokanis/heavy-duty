import { describe, expect, it } from 'vitest'
import { createApp } from '../../app.js'
import { createTestDatabase } from '../../test/database.js'

const APP_ORIGIN = 'https://hd.example'

const PROTECTED_RESOURCE_METADATA = {
  resource: 'https://hd.example/mcp',
  authorization_servers: ['https://hd.example'],
  bearer_methods_supported: ['header'],
  resource_name: 'Heavy Duty MCP',
}

const AUTHORIZATION_SERVER_METADATA = {
  issuer: 'https://hd.example',
  authorization_endpoint: 'https://hd.example/autorizar',
  token_endpoint: 'https://hd.example/api/oauth/token',
  registration_endpoint: 'https://hd.example/api/oauth/register',
  response_types_supported: ['code'],
  grant_types_supported: ['authorization_code', 'refresh_token'],
  code_challenge_methods_supported: ['S256'],
  token_endpoint_auth_methods_supported: ['none'],
}

async function readJson(app: ReturnType<typeof createApp>, path: string) {
  const response = await app.request(path)
  return { status: response.status, body: await response.json() }
}

describe('Given an app in production with a database and APP_ORIGIN https://hd.example', () => {
  const app = createApp({
    nodeEnv: 'production',
    databaseHealth: () => true,
    db: createTestDatabase(),
    appOrigin: APP_ORIGIN,
  })

  describe('When a client without a cookie asks for the protected resource metadata of /mcp and of the root', () => {
    it('Then both should answer 200 with the /mcp resource and the app as authorization server', async () => {
      const documents = await Promise.all([
        readJson(app, '/.well-known/oauth-protected-resource/mcp'),
        readJson(app, '/.well-known/oauth-protected-resource'),
      ])

      expect(documents).toEqual([
        { status: 200, body: PROTECTED_RESOURCE_METADATA },
        { status: 200, body: PROTECTED_RESOURCE_METADATA },
      ])
    })
  })

  describe('When a client without a cookie asks for the authorization server metadata', () => {
    it('Then should answer 200 with the endpoints of the app, S256 and the public client method', async () => {
      const document = await readJson(app, '/.well-known/oauth-authorization-server')

      expect(document).toEqual({ status: 200, body: AUTHORIZATION_SERVER_METADATA })
    })
  })
})

describe('Given an app in production without a database', () => {
  const app = createApp({
    nodeEnv: 'production',
    databaseHealth: () => false,
    appOrigin: APP_ORIGIN,
  })

  describe('When the three discovery documents are requested', () => {
    it('Then should answer 404 to each', async () => {
      const responses = await Promise.all([
        app.request('/.well-known/oauth-protected-resource/mcp'),
        app.request('/.well-known/oauth-protected-resource'),
        app.request('/.well-known/oauth-authorization-server'),
      ])

      expect(responses.map((response) => response.status)).toEqual([404, 404, 404])
    })
  })
})
