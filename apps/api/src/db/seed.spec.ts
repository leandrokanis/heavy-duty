import { asc } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { createTestDatabase } from '../test/database.js'
import { muscleGroups, settings } from './schema.js'
import { runSeed } from './seed.js'

const D30_MUSCLE_GROUPS = [
  { slug: 'chest', name: 'peito', position: 1 },
  { slug: 'back', name: 'costas', position: 2 },
  { slug: 'lower-back', name: 'lombar', position: 3 },
  { slug: 'shoulders', name: 'ombros', position: 4 },
  { slug: 'biceps', name: 'bíceps', position: 5 },
  { slug: 'triceps', name: 'tríceps', position: 6 },
  { slug: 'abs', name: 'abdômen', position: 7 },
  { slug: 'quadriceps', name: 'quadríceps', position: 8 },
  { slug: 'hamstrings', name: 'posteriores de coxa', position: 9 },
  { slug: 'glutes', name: 'glúteos', position: 10 },
  { slug: 'calves', name: 'panturrilhas', position: 11 },
]

describe('Given a migrated in-memory database', () => {
  describe('When the seed runs twice', () => {
    it('Then should keep the settings table empty', () => {
      const db = createTestDatabase()

      runSeed(db)
      runSeed(db)

      expect(db.select().from(settings).all()).toEqual([])
    })

    it('Then should hold the 11 muscle groups in D30 order with the ids of the first run', () => {
      const db = createTestDatabase()
      const readGroups = () =>
        db.select().from(muscleGroups).orderBy(asc(muscleGroups.position)).all()

      runSeed(db)
      const firstRunIds = readGroups().map((group) => group.id)
      runSeed(db)
      const groups = readGroups()

      expect({
        groups: groups.map(({ slug, name, position }) => ({ slug, name, position })),
        ids: groups.map((group) => group.id),
      }).toEqual({ groups: D30_MUSCLE_GROUPS, ids: firstRunIds })
    })
  })
})
