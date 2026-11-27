import { describe, expect, it } from 'vitest'
import { createTestDatabase } from '../../test/database.js'
import { seedMuscleGroups } from '../catalog/muscle-group.catalog.js'
import { medalShelfOf, recordMedalAwards } from './medal.service.js'
import type { MedalAward } from './medals.rules.js'

const NOW = new Date('2026-12-04T10:00:00.000Z')
const LEVEL_10_IN_CHEST: MedalAward = {
  code: 'level_10',
  awardedAtMs: Date.parse('2026-12-03T21:40:00.000Z'),
  workoutId: null,
  subject: 'chest',
}

function givenDatabase() {
  const db = createTestDatabase()
  seedMuscleGroups(db)
  return db
}

describe('Given no medal awarded', () => {
  describe('When the shelf is read', () => {
    it('Then it should list the 10 medals of the catalog, none awarded', () => {
      const shelf = medalShelfOf(givenDatabase(), NOW)
      expect({
        now: shelf.now,
        count: shelf.medals.length,
        awarded: shelf.medals.filter(({ awardedAt }) => awardedAt !== null),
      }).toEqual({ now: NOW.toISOString(), count: 10, awarded: [] })
    })

    it('Then the hidden medals should come with no name, criterion nor icon', () => {
      const hidden = medalShelfOf(givenDatabase(), NOW).medals.filter(({ hidden }) => hidden)
      expect(
        hidden.map(({ code, name, criterion, icon }) => ({ code, name, criterion, icon })),
      ).toEqual([
        { code: 'all_letters_in_week', name: null, criterion: null, icon: null },
        { code: 'window_saved_at_end', name: null, criterion: null, icon: null },
      ])
    })
  })
})

describe('Given the level 10 medal in chest is detected', () => {
  describe('When it is recorded', () => {
    it('Then the shelf should show it with the instant of the event and the group', () => {
      const db = givenDatabase()
      expect(recordMedalAwards(db, [LEVEL_10_IN_CHEST], NOW)).toEqual(['level_10'])
      expect(medalShelfOf(db, NOW).medals.find(({ code }) => code === 'level_10')).toEqual({
        code: 'level_10',
        name: 'Nível 10',
        criterion: 'Leve um grupo muscular ao nível 10.',
        icon: 'shield',
        hidden: false,
        awardedAt: '2026-12-03T21:40:00.000Z',
        subject: { slug: 'chest', name: 'peito' },
        workoutId: null,
      })
    })
  })

  describe('When it is detected again later, as back at level 10', () => {
    it('Then it should keep the first award', () => {
      const db = givenDatabase()
      recordMedalAwards(db, [LEVEL_10_IN_CHEST], NOW)
      const again = { ...LEVEL_10_IN_CHEST, subject: 'back', awardedAtMs: NOW.getTime() }
      expect(recordMedalAwards(db, [again], NOW)).toEqual([])
      expect(medalShelfOf(db, NOW).medals.find(({ code }) => code === 'level_10')).toMatchObject({
        awardedAt: '2026-12-03T21:40:00.000Z',
        subject: { slug: 'chest' },
      })
    })
  })

  describe('When the rules no longer detect it, as when chest falls to level 8', () => {
    it('Then the medal should stay on the shelf', () => {
      const db = givenDatabase()
      recordMedalAwards(db, [LEVEL_10_IN_CHEST], NOW)
      recordMedalAwards(db, [], NOW)
      expect(medalShelfOf(db, NOW).medals.find(({ code }) => code === 'level_10')?.awardedAt).toBe(
        '2026-12-03T21:40:00.000Z',
      )
    })
  })
})

describe('Given a hidden medal is awarded', () => {
  describe('When the shelf is read', () => {
    it('Then it should show its name, criterion and icon', () => {
      const db = givenDatabase()
      recordMedalAwards(
        db,
        [
          {
            code: 'window_saved_at_end',
            awardedAtMs: NOW.getTime(),
            workoutId: null,
            subject: null,
          },
        ],
        NOW,
      )
      expect(
        medalShelfOf(db, NOW).medals.find(({ code }) => code === 'window_saved_at_end'),
      ).toMatchObject({ name: 'Janela salva no fim', icon: 'star', hidden: true })
    })
  })
})
