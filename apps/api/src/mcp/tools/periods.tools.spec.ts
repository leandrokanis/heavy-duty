import { describe, expect, it } from 'vitest'
import { createProgramTestApp, type ProgramTestApp } from '../../test/programs.js'

type App = ProgramTestApp['app']

type JsonRpcResponse = {
  result?: {
    structuredContent?: Record<string, unknown>
    isError?: boolean
    content?: { type: string; text: string }[]
    tools?: { name: string; annotations?: { readOnlyHint?: boolean; destructiveHint?: boolean } }[]
  }
}

async function rpc(app: App, method: string, params: Record<string, unknown>) {
  const response = await app.request('/mcp', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  })
  return (await response.json()) as JsonRpcResponse
}

const callTool = (app: App, name: string, args: Record<string, unknown> = {}) =>
  rpc(app, 'tools/call', { name, arguments: args })

// The clock of the test app starts on Saturday 2026-11-21 at 10:00Z.
describe('Given the first read of the period through /mcp (US-F11-01)', () => {
  describe('When get_period is called', () => {
    it('Then should return period 1 from the Monday of the week, the same as GET /api/periods/current', async () => {
      const { app } = createProgramTestApp()

      const called = await callTool(app, 'get_period')
      const fromRoute = await (await app.request('/api/periods/current')).json()

      expect(called.result?.structuredContent).toMatchObject({
        number: 1,
        startsAt: '2026-11-16T03:00:00.000Z',
        endsAt: '2027-02-08T03:00:00.000Z',
        week: 1,
        intention: null,
      })
      expect(called.result?.structuredContent).toEqual(fromRoute)
    })
  })
})

describe('Given the current period with no intention (US-F11-01)', () => {
  describe('When set_period_intention is called through /mcp', () => {
    it('Then the athlete should see the intention on the period', async () => {
      const { app } = createProgramTestApp()

      await callTool(app, 'set_period_intention', { intention: 'Treinar três vezes por semana.' })

      const period = (await (await app.request('/api/periods/current')).json()) as {
        intention: string | null
      }
      expect(period.intention).toBe('Treinar três vezes por semana.')
    })
  })

  describe('When set_period_intention is called with 121 characters', () => {
    it('Then should return isError with period_intention_too_long', async () => {
      const { app } = createProgramTestApp()

      const called = await callTool(app, 'set_period_intention', { intention: 'a'.repeat(121) })

      expect({
        isError: called.result?.isError,
        error: JSON.parse(called.result?.content?.[0]?.text ?? '{}'),
      }).toEqual({
        isError: true,
        error: {
          code: 'period_intention_too_long',
          message: 'a frase de intenção deve ter até 120 caracteres',
        },
      })
    })
  })

  describe('When tools/list is called through /mcp', () => {
    it('Then get_period should be read only and set_period_intention neither read only nor destructive', async () => {
      const { app } = createProgramTestApp()

      const listed = await rpc(app, 'tools/list', {})
      const hints = (name: string) => {
        const tool = listed.result?.tools?.find((candidate) => candidate.name === name)
        return [tool?.annotations?.readOnlyHint, tool?.annotations?.destructiveHint]
      }

      expect([hints('get_period'), hints('set_period_intention')]).toEqual([
        [true, undefined],
        [false, false],
      ])
    })
  })
})
