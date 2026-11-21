import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { DomainError } from '../../errors/domain-error.js'
import { type ErrorBody, INTERNAL_ERROR_BODY } from '../../http/errors.js'

export function structuredResult<T extends Record<string, unknown>>(value: T): CallToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(value) }],
    structuredContent: value,
  }
}

function errorResult(body: ErrorBody): CallToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(body) }], isError: true }
}

export function runTool(action: () => Record<string, unknown>): CallToolResult {
  try {
    return structuredResult(action())
  } catch (error) {
    if (error instanceof DomainError) {
      return errorResult({ code: error.code, message: error.message })
    }
    // The SDK would turn the raw message into the result, leaking internal detail.
    console.error('Unhandled MCP tool error:', error)
    return errorResult(INTERNAL_ERROR_BODY)
  }
}
