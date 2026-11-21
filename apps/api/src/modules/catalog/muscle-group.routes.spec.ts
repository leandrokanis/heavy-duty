import { describe, expect, it } from 'vitest'
import { createApp } from '../../app.js'
import { runSeed } from '../../db/seed.js'
import { createTestDatabase } from '../../test/database.js'

describe('Given a seeded database', () => {
  const db = createTestDatabase()
  runSeed(db)
  const app = createApp({ nodeEnv: 'test', databaseHealth: () => true, db })

  describe('When GET /api/muscle-groups is requested', () => {
    it('Then should respond 200 with the 11 groups ordered by position, each with id, slug, name and position', async () => {
      const response = await app.request('/api/muscle-groups')

      expect({ status: response.status, body: await response.json() }).toEqual({
        status: 200,
        body: {
          muscleGroups: [
            { id: expect.any(String), slug: 'chest', name: 'peito', position: 1 },
            { id: expect.any(String), slug: 'back', name: 'costas', position: 2 },
            { id: expect.any(String), slug: 'lower-back', name: 'lombar', position: 3 },
            { id: expect.any(String), slug: 'shoulders', name: 'ombros', position: 4 },
            { id: expect.any(String), slug: 'biceps', name: 'bíceps', position: 5 },
            { id: expect.any(String), slug: 'triceps', name: 'tríceps', position: 6 },
            { id: expect.any(String), slug: 'abs', name: 'abdômen', position: 7 },
            { id: expect.any(String), slug: 'quadriceps', name: 'quadríceps', position: 8 },
            {
              id: expect.any(String),
              slug: 'hamstrings',
              name: 'posteriores de coxa',
              position: 9,
            },
            { id: expect.any(String), slug: 'glutes', name: 'glúteos', position: 10 },
            { id: expect.any(String), slug: 'calves', name: 'panturrilhas', position: 11 },
          ],
        },
      })
    })
  })
})
