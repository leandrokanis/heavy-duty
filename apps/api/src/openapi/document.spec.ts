import { describe, expect, it } from 'vitest'
import { createApp } from '../app.js'
import { compareDocuments } from './document.js'

type OpenApiDocument = {
  openapi: string
  paths: Record<string, Record<string, { responses: Record<string, unknown> }>>
}

describe('Given an app in development', () => {
  const app = createApp({ nodeEnv: 'development', databaseHealth: () => true })

  describe('When GET /api/openapi.json is requested', () => {
    it('Then should describe the GET /api/health operation', async () => {
      const response = await app.request('/api/openapi.json')
      const document = (await response.json()) as OpenApiDocument

      expect({
        status: response.status,
        openapi: document.openapi,
        healthResponses: Object.keys(document.paths['/api/health']?.get?.responses ?? {}).sort(),
      }).toEqual({ status: 200, openapi: '3.1.0', healthResponses: ['200', '500', '503'] })
    })
  })
  describe('When GET /api/docs is requested', () => {
    it('Then should serve the Swagger UI page for the OpenAPI document', async () => {
      const response = await app.request('/api/docs')
      const html = await response.text()

      expect({
        status: response.status,
        isSwaggerUi: html.includes('SwaggerUIBundle'),
        pointsToDocument: html.includes('/api/openapi.json'),
      }).toEqual({ status: 200, isSwaggerUi: true, pointsToDocument: true })
    })
  })
})

describe('Given a versioned document that differs from the generated one', () => {
  const versioned = '{\n  "openapi": "3.1.0",\n  "info": { "version": "0.0.0" }\n}\n'
  const generated = '{\n  "openapi": "3.1.0",\n  "info": { "version": "0.0.1" }\n}\n'

  describe('When they are compared', () => {
    it('Then should report the mismatch', () => {
      expect(compareDocuments(versioned, generated)).toEqual({
        isEqual: false,
        diff: [
          'line 3:',
          '-   "info": { "version": "0.0.0" }',
          '+   "info": { "version": "0.0.1" }',
        ].join('\n'),
      })
    })
  })
})
