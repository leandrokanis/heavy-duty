import { describe, expect, it } from 'vitest'
import { createTestDatabase } from '../test/database.js'
import { weeklyGoals } from './schema.js'

const insertGoal = (windows: number) => () =>
  createTestDatabase()
    .insert(weeklyGoals)
    .values({ id: `goal-${windows}`, windows, definedAt: '2026-11-24T12:00:00.000Z' })
    .run()

describe('Given the weekly_goals table of migration 0012', () => {
  describe.each([1, 77])('When a goal of %i windows is inserted', (windows) => {
    it('Then the CHECK should accept it', () => {
      expect(insertGoal(windows)).not.toThrow()
    })
  })

  describe.each([0, 78])('When a goal of %i windows is inserted', (windows) => {
    it('Then the CHECK should refuse it', () => {
      expect(insertGoal(windows)).toThrow(/CHECK constraint failed: weekly_goals_windows_check/)
    })
  })
})
