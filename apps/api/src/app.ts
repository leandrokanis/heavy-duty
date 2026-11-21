import { swaggerUI } from '@hono/swagger-ui'
import type { OpenAPIHono } from '@hono/zod-openapi'
import { createRouter, handleError, handleNotFound } from './http/errors.js'
import { handleMcpRequest, MCP_PATH } from './mcp/server.js'
import { createHealthRoutes } from './modules/system/health.routes.js'
import type { DatabaseHealthProbe } from './modules/system/health.service.js'
import { OPENAPI_CONFIG, OPENAPI_DOCUMENT_PATH } from './openapi/document.js'

export type AppOptions = {
  nodeEnv: string
  databaseHealth: DatabaseHealthProbe
}

export function createApp(options: AppOptions): OpenAPIHono {
  const app = createRouter()

  app.route('/', createHealthRoutes(options.databaseHealth))

  // Hidden in production until authentication exists (NFR02), see ADR-017.
  if (options.nodeEnv !== 'production') {
    app.doc31(OPENAPI_DOCUMENT_PATH, OPENAPI_CONFIG)
    app.get('/api/docs', swaggerUI({ url: OPENAPI_DOCUMENT_PATH }))
    app.all(MCP_PATH, handleMcpRequest)
  }

  app.notFound(handleNotFound)
  app.onError(handleError)

  return app
}
