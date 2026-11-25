import { describe, expect, it } from 'vitest'
import {
  isEmailEnabled,
  setEmailNotices,
} from '../../modules/notifications/email-settings.service.js'
import { createProgramTestApp, type ProgramTestApp } from '../../test/programs.js'

type App = ProgramTestApp['app']

type JsonRpcResponse = {
  result?: {
    structuredContent?: unknown
    isError?: boolean
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

function setEmailNoticesTool(app: App, args: Record<string, unknown>) {
  return rpc(app, 'tools/call', { name: 'set_email_notices', arguments: args })
}

describe('Given the emails turned off from a link (US-F17-04)', () => {
  describe('When set_email_notices is called with enabled true through /mcp', () => {
    it('Then should return the emails on with the clock of the API', async () => {
      const { app, db } = createProgramTestApp()
      setEmailNotices(db, { enabled: false }, new Date('2026-11-20T10:00:00.000Z'))

      const called = await setEmailNoticesTool(app, { enabled: true })

      expect(called.result?.structuredContent).toEqual({
        emailEnabled: true,
        updatedAt: '2026-11-21T10:00:00.000Z',
      })
    })

    it('Then the emails should be on', async () => {
      const { app, db } = createProgramTestApp()
      setEmailNotices(db, { enabled: false }, new Date('2026-11-20T10:00:00.000Z'))

      await setEmailNoticesTool(app, { enabled: true })

      expect(isEmailEnabled(db)).toBe(true)
    })
  })
})

describe('Given the emails on', () => {
  describe('When set_email_notices is called with enabled false through /mcp', () => {
    it('Then the emails should be off', async () => {
      const { app, db } = createProgramTestApp()

      await setEmailNoticesTool(app, { enabled: false })

      expect(isEmailEnabled(db)).toBe(false)
    })
  })

  describe('When set_email_notices is called without enabled', () => {
    it('Then should refuse the call and keep the emails on', async () => {
      const { app, db } = createProgramTestApp()

      const called = await setEmailNoticesTool(app, {})

      expect([called.result?.isError, isEmailEnabled(db)]).toEqual([true, true])
    })
  })

  describe('When tools/list is called through /mcp', () => {
    it('Then set_email_notices should be neither read only nor destructive', async () => {
      const { app } = createProgramTestApp()

      const listed = await rpc(app, 'tools/list', {})
      const tool = listed.result?.tools?.find(({ name }) => name === 'set_email_notices')

      expect([tool?.annotations?.readOnlyHint, tool?.annotations?.destructiveHint]).toEqual([
        false,
        false,
      ])
    })
  })
})
