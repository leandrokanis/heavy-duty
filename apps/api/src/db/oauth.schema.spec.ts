import { describe, expect, it } from 'vitest'
import { createTestDatabase } from '../test/database.js'

const NOW = '2026-11-21T10:00:00.000Z'
const LATER = '2026-11-21T11:00:00.000Z'

function givenClientWithCodeAndGrant() {
  const db = createTestDatabase()
  db.$client
    .prepare(
      `INSERT INTO oauth_clients (id, client_name, redirect_uris, created_at, approved_at)
       VALUES ('client-1', 'Claude', '["https://claude.example/callback"]', ?, ?)`,
    )
    .run(NOW, NOW)
  db.$client
    .prepare(
      `INSERT INTO oauth_authorization_codes
         (id, code_hash, client_id, redirect_uri, code_challenge, resource, created_at, expires_at)
       VALUES ('code-1', 'code-hash-1', 'client-1', 'https://claude.example/callback',
               'challenge', 'https://hd.example/mcp', ?, ?)`,
    )
    .run(NOW, LATER)
  const insertGrant = db.$client.prepare(
    `INSERT INTO oauth_grants
       (id, client_id, resource, access_token_hash, access_expires_at, refresh_token_hash,
        refresh_expires_at, created_at)
     VALUES (?, 'client-1', 'https://hd.example/mcp', ?, ?, ?, ?, ?)`,
  )
  insertGrant.run('grant-1', 'access-hash-1', LATER, 'refresh-hash-1', LATER, NOW)
  return { db, insertGrant }
}

function countRows(db: ReturnType<typeof createTestDatabase>, table: string): number {
  return (db.$client.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }).n
}

describe('Given a migrated database with an OAuth client, a code and a grant', () => {
  describe('When a second grant reuses the same access_token_hash', () => {
    it('Then the database should refuse it with a UNIQUE constraint error', () => {
      const { insertGrant } = givenClientWithCodeAndGrant()

      expect(() =>
        insertGrant.run('grant-2', 'access-hash-1', LATER, 'refresh-hash-2', LATER, NOW),
      ).toThrow(/UNIQUE constraint failed: oauth_grants\.access_token_hash/)
    })
  })

  describe('When the client is deleted', () => {
    it('Then its codes and grants should be deleted with it', () => {
      const { db } = givenClientWithCodeAndGrant()

      db.$client.prepare("DELETE FROM oauth_clients WHERE id = 'client-1'").run()

      expect({
        codes: countRows(db, 'oauth_authorization_codes'),
        grants: countRows(db, 'oauth_grants'),
      }).toEqual({ codes: 0, grants: 0 })
    })
  })
})
