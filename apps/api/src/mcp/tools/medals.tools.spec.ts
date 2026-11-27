import { describe, expect, it } from 'vitest'
import { createProgramTestApp } from '../../test/programs.js'

async function callListMedals(app: ReturnType<typeof createProgramTestApp>['app']) {
  const response = await app.request('/mcp', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name: 'list_medals', arguments: {} },
    }),
  })
  return ((await response.json()) as { result?: { structuredContent?: unknown } }).result
}

describe('Given the medals of the athlete (US-F19-01)', () => {
  describe('When list_medals is called through /mcp', () => {
    it('Then should return the same object as GET /api/medals', async () => {
      const { app } = createProgramTestApp()

      const called = await callListMedals(app)
      const fromRoute = await (await app.request('/api/medals')).json()

      expect(called?.structuredContent).toEqual(fromRoute)
    })
  })
})
