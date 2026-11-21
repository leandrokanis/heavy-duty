import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'
import { APP_BASE_URL, callMcpTool, listPrograms } from './catalog-api.js'
import { test } from './mcp-auth-fixtures.js'

const { Given, When, Then } = createBdd(test)

Given("Claude is connected to the MCP with Leandro's credential", async ({ mcpAccessToken }) => {
  expect(mcpAccessToken).toMatch(/^[A-Za-z0-9_-]{43}$/)
})

Given('the program {string} is registered', async ({ request }, name: string) => {
  const response = await callMcpTool(request, 'create_program', { name, goal: 'hypertrophy' })

  expect(response.status()).toBe(200)
})

When('the planner asks for the list of programs', async ({ request, mcpAuth }) => {
  mcpAuth.listed = await callMcpTool(request, 'list_programs', {})
})

Then('the registered programs should be listed', async ({ request, mcpAuth }) => {
  const body = (await mcpAuth.listed?.json()) as {
    result?: { structuredContent?: { programs?: { name: string }[] } }
  }
  const stored = (await (await listPrograms(request)).json()) as { programs: { name: string }[] }

  expect({
    status: mcpAuth.listed?.status(),
    listed: body.result?.structuredContent,
    hasProgram: body.result?.structuredContent?.programs?.some((p) => p.name === 'Programa MCP'),
  }).toEqual({ status: 200, listed: stored, hasProgram: true })
})

// Through the e2e proxy, as Claude reaches the public domain, and with no cookie either.
When(
  'a client tries to use the MCP without a valid credential',
  async ({ playwright, mcpAuth }) => {
    const anonymous = await playwright.request.newContext()
    mcpAuth.refused = await anonymous.post(`${APP_BASE_URL}/mcp`, {
      headers: { accept: 'application/json, text/event-stream' },
      data: {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name: 'list_programs', arguments: {} },
      },
    })
  },
)

Then('the call should be refused', async ({ mcpAuth }) => {
  expect({
    status: mcpAuth.refused?.status(),
    wwwAuthenticate: mcpAuth.refused?.headers()['www-authenticate'],
  }).toEqual({
    status: 401,
    wwwAuthenticate: `Bearer resource_metadata="${APP_BASE_URL}/.well-known/oauth-protected-resource/mcp"`,
  })
})

Then('no data should be exposed', async ({ mcpAuth }) => {
  expect(await mcpAuth.refused?.json()).toEqual({
    code: 'mcp_unauthenticated',
    message: 'credencial do MCP ausente ou inválida',
  })
})
