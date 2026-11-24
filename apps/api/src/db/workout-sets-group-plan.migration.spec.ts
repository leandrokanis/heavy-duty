import { rmSync } from 'node:fs'
import { afterEach, describe, expect, it } from 'vitest'
import { seedMuscleGroups } from '../modules/catalog/muscle-group.catalog.js'
import { migrateBefore } from '../test/migrations.js'
import { type Database, openDatabase } from './connection.js'
import { runMigrations } from './migrate.js'

const GROUP_PLAN_MIGRATION_INDEX = 11

// Letter A: supino-reto 3 sets (chest, triceps secondary), crucifixo 3 sets (chest) and
// triceps-polia 4 sets (triceps). Workout 1 trains letter A; workout 2 lost its letter.
function givenOldSets(db: Database): void {
  seedMuscleGroups(db)
  db.$client.exec(`
    INSERT INTO muscles (id, muscle_group_id, slug, name) VALUES
      ('m-chest', (SELECT id FROM muscle_groups WHERE slug = 'chest'), 'peitoral-maior', 'peitoral maior'),
      ('m-triceps', (SELECT id FROM muscle_groups WHERE slug = 'triceps'), 'triceps-braquial', 'tríceps braquial');
    INSERT INTO exercises (id, slug, name, kind) VALUES
      ('ex-bench', 'supino-reto', 'Supino reto', 'reps'),
      ('ex-fly', 'crucifixo', 'Crucifixo', 'reps'),
      ('ex-pushdown', 'triceps-polia', 'Tríceps na polia', 'reps');
    INSERT INTO exercise_muscles (exercise_id, muscle_id, role) VALUES
      ('ex-bench', 'm-chest', 'primary'),
      ('ex-bench', 'm-triceps', 'secondary'),
      ('ex-fly', 'm-chest', 'primary'),
      ('ex-pushdown', 'm-triceps', 'primary');
    INSERT INTO programs (id, name, goal, is_active, created_at)
      VALUES ('program-1', 'Programa 1', 'hypertrophy', 1, '2026-11-01T00:00:00.000Z');
    INSERT INTO program_days (id, program_id, letter, position) VALUES ('day-a', 'program-1', 'A', 1);
    INSERT INTO planned_exercises
      (id, program_day_id, exercise_id, position, sets, target_reps, target_seconds, load_g, rest_seconds)
    VALUES
      ('planned-bench', 'day-a', 'ex-bench', 1, 3, 10, NULL, 40000, 90),
      ('planned-fly', 'day-a', 'ex-fly', 2, 3, 12, NULL, 14000, 60),
      ('planned-pushdown', 'day-a', 'ex-pushdown', 3, 4, 12, NULL, 20000, 60);
    INSERT INTO workouts (id, program_id, program_day_id, letter, started_at) VALUES
      ('workout-1', 'program-1', 'day-a', 'A', '2026-11-20T18:30:00.000Z'),
      ('workout-2', 'program-1', NULL, 'B', '2026-11-21T18:30:00.000Z');
    INSERT INTO workout_sets
      (id, workout_id, exercise_id, planned_exercise_id, set_number, load_g, reps, seconds, performed_at)
    VALUES
      ('set-bench', 'workout-1', 'ex-bench', 'planned-bench', 1, 40000, 10, NULL, '2026-11-20T18:31:00.000Z'),
      ('set-pushdown', 'workout-1', 'ex-pushdown', 'planned-pushdown', 1, 20000, 12, NULL, '2026-11-20T18:50:00.000Z'),
      ('set-lost', 'workout-2', 'ex-bench', NULL, 1, 40000, 10, NULL, '2026-11-21T18:31:00.000Z');
  `)
}

function readGroupPlans(db: Database): { id: string; plannedGroupSets: string | null }[] {
  return db.$client
    .prepare<[], { id: string; plannedGroupSets: string | null }>(
      'SELECT id, planned_group_sets AS plannedGroupSets FROM workout_sets ORDER BY id',
    )
    .all()
}

describe('Given sets recorded before the planned sets of the group were frozen (ADR-033)', () => {
  let db: Database | undefined
  let folder: string | undefined

  afterEach(() => {
    db?.$client.close()
    if (folder) rmSync(folder, { recursive: true, force: true })
  })

  describe('When the migration of the planned sets of the group runs', () => {
    it('Then each set takes the planned sets of its primary groups in the current letter, and a workout with no letter stays null', () => {
      db = openDatabase(':memory:')
      folder = migrateBefore(db, GROUP_PLAN_MIGRATION_INDEX)
      givenOldSets(db)

      runMigrations(db)

      expect(readGroupPlans(db)).toEqual([
        { id: 'set-bench', plannedGroupSets: '{"chest":6}' },
        { id: 'set-lost', plannedGroupSets: null },
        { id: 'set-pushdown', plannedGroupSets: '{"triceps":4}' },
      ])
    })
  })
})
