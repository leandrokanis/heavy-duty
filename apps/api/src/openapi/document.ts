export const OPENAPI_DOCUMENT_PATH = '/api/openapi.json'

export const OPENAPI_CONFIG: {
  openapi: string
  info: { title: string; version: string; description: string }
  security: Record<string, string[]>[]
} = {
  openapi: '3.1.0',
  info: {
    title: 'Heavy Duty API',
    version: '0.0.0',
    description: 'HTTP API of the Heavy Duty training app.',
  },
  security: [{ sessionCookie: [] }],
}

export const SESSION_COOKIE_SECURITY_SCHEME = {
  type: 'apiKey',
  in: 'cookie',
  name: 'hd_session',
} as const

export type DocumentComparison = {
  isEqual: boolean
  diff: string
}

export function compareDocuments(versioned: string, generated: string): DocumentComparison {
  const versionedLines = versioned.split('\n')
  const generatedLines = generated.split('\n')
  const lineCount = Math.max(versionedLines.length, generatedLines.length)
  const diff: string[] = []

  for (let index = 0; index < lineCount; index++) {
    const versionedLine = versionedLines[index]
    const generatedLine = generatedLines[index]
    if (versionedLine !== generatedLine) {
      diff.push(`line ${index + 1}:`)
      if (versionedLine !== undefined) diff.push(`- ${versionedLine}`)
      if (generatedLine !== undefined) diff.push(`+ ${generatedLine}`)
    }
  }

  return { isEqual: diff.length === 0, diff: diff.join('\n') }
}
