import { describe, expect, it } from 'vitest'
import { createApp } from '../app.js'

const INITIALIZE_BODY = JSON.stringify({
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2025-06-18',
    capabilities: {},
    clientInfo: { name: 'heavy-duty-spec', version: '0.0.0' },
  },
})

function postMcp(
  app: ReturnType<typeof createApp>,
  headers: Record<string, string>,
): Promise<Response> {
  return Promise.resolve(
    app.request('/mcp', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
        ...headers,
      },
      body: INITIALIZE_BODY,
    }),
  )
}

describe('Given an app in development with the default allowed hosts', () => {
  const app = createApp({ nodeEnv: 'development', databaseHealth: () => true })

  describe('When /mcp is requested with a foreign Host header', () => {
    it('Then should refuse with 403 and the forbidden_host code', async () => {
      const response = await postMcp(app, { host: 'evil.example' })

      expect(response.status).toBe(403)
      expect(await response.json()).toEqual({
        code: 'forbidden_host',
        message: 'host não permitido',
      })
    })
  })

  describe('When /mcp is requested through the local proxy host', () => {
    it('Then should reach the MCP server', async () => {
      const response = await postMcp(app, { host: '127.0.0.1:8080' })

      expect(response.status).toBe(200)
      expect(await response.json()).toHaveProperty('result')
    })
  })

  describe('When /mcp is requested with a local Host and a foreign Origin', () => {
    it('Then should refuse with 403', async () => {
      const response = await postMcp(app, {
        host: 'localhost:8080',
        origin: 'http://evil.example',
      })

      expect(response.status).toBe(403)
    })
  })

  describe('When /mcp is requested with a local Host and a local Origin', () => {
    it('Then should reach the MCP server', async () => {
      const response = await postMcp(app, {
        host: 'localhost:8080',
        origin: 'http://localhost:8080',
      })

      expect(response.status).toBe(200)
    })
  })
})

describe('Given an app in development that allows a custom host', () => {
  const app = createApp({
    nodeEnv: 'development',
    databaseHealth: () => true,
    mcpAllowedHosts: ['heavy-duty.example'],
  })

  describe('When /mcp is requested with that host', () => {
    it('Then should reach the MCP server', async () => {
      const response = await postMcp(app, { host: 'heavy-duty.example' })

      expect(response.status).toBe(200)
    })
  })

  describe('When /mcp is requested with a default local host', () => {
    it('Then should refuse with 403', async () => {
      const response = await postMcp(app, { host: '127.0.0.1:8080' })

      expect(response.status).toBe(403)
    })
  })
})
