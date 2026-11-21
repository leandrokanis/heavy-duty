import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createApp } from '../src/app.js'
import { openDatabase } from '../src/db/connection.js'
import { runMigrations } from '../src/db/migrate.js'
import { compareDocuments, OPENAPI_CONFIG } from '../src/openapi/document.js'

const VERSIONED_PATH = fileURLToPath(
  new URL('../../../docs/arquitetura/openapi.json', import.meta.url),
)

// Catalog routes are mounted only with a database, so the document needs one.
function generateDocument(): string {
  const db = openDatabase(':memory:')
  try {
    runMigrations(db)
    const app = createApp({ nodeEnv: 'development', databaseHealth: () => true, db })
    return `${JSON.stringify(app.getOpenAPI31Document(OPENAPI_CONFIG), null, 2)}\n`
  } finally {
    db.$client.close()
  }
}

function readVersionedDocument(): string {
  try {
    return readFileSync(VERSIONED_PATH, 'utf8')
  } catch {
    return ''
  }
}

const generated = generateDocument()

if (process.argv.includes('--check')) {
  const comparison = compareDocuments(readVersionedDocument(), generated)
  if (!comparison.isEqual) {
    console.error(
      'docs/arquitetura/openapi.json is out of date. Run `pnpm --filter @heavy-duty/api openapi`.',
    )
    console.error(comparison.diff)
    process.exit(1)
  }
  console.log('docs/arquitetura/openapi.json is up to date.')
} else {
  writeFileSync(VERSIONED_PATH, generated)
  console.log('docs/arquitetura/openapi.json written.')
}
