import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { afterEach, describe, expect, it } from 'vitest'
import { type Database, openDatabase } from './connection.js'
import { runMigrations } from './migrate.js'

const MIGRATIONS_FOLDER = fileURLToPath(new URL('./migrations', import.meta.url))
const PLAN_MIGRATION_INDEX = 10

// A copy of the migrations that stops right before the frozen plan, so old sets can be stored.
function migrateBeforePlan(db: Database): string {
  const folder = mkdtempSync(join(tmpdir(), 'heavy-duty-migrations-'))
  cpSync(MIGRATIONS_FOLDER, folder, { recursive: true })
  const journalPath = join(folder, 'meta', '_journal.json')
  const journal = JSON.parse(readFileSync(journalPath, 'utf8')) as { entries: { idx: number }[] }
  journal.entries = journal.entries.filter(({ idx }) => idx < PLAN_MIGRATION_INDEX)
  writeFileSync(journalPath, JSON.stringify(journal))
  migrate(db, { migrationsFolder: folder })
  return folder
}

function givenOldSets(db: Database): void {
  db.$client.exec(`
    INSERT INTO exercises (id, slug, name, kind) VALUES
      ('ex-bench', 'supino-reto', 'Supino reto', 'reps'),
      ('ex-plank', 'prancha', 'Prancha', 'time'),
      ('ex-row', 'remada', 'Remada', 'reps');
    INSERT INTO programs (id, name, goal, is_active, created_at)
      VALUES ('program-1', 'Programa 1', 'hypertrophy', 1, '2026-11-01T00:00:00.000Z');
    INSERT INTO program_days (id, program_id, letter, position) VALUES ('day-a', 'program-1', 'A', 1);
    INSERT INTO planned_exercises
      (id, program_day_id, exercise_id, position, sets, target_reps, target_seconds, load_g, rest_seconds)
    VALUES
      ('planned-bench', 'day-a', 'ex-bench', 1, 3, 10, NULL, 40000, 90),
      ('planned-plank', 'day-a', 'ex-plank', 2, 2, NULL, 60, 0, 60);
    INSERT INTO workouts (id, program_id, program_day_id, letter, started_at)
      VALUES ('workout-1', 'program-1', 'day-a', 'A', '2026-11-20T18:30:00.000Z');
    INSERT INTO workout_sets
      (id, workout_id, exercise_id, planned_exercise_id, set_number, load_g, reps, seconds, performed_at)
    VALUES
      ('set-bench', 'workout-1', 'ex-bench', 'planned-bench', 1, 42500, 10, NULL, '2026-11-20T18:31:00.000Z'),
      ('set-plank', 'workout-1', 'ex-plank', 'planned-plank', 1, 0, NULL, 45, '2026-11-20T18:40:00.000Z'),
      ('set-row', 'workout-1', 'ex-row', NULL, 1, 30000, 8, NULL, '2026-11-20T18:50:00.000Z');
  `)
}

type PlanRow = {
  id: string
  plannedLoadG: number | null
  targetReps: number | null
  targetSeconds: number | null
}

function readPlans(db: Database): PlanRow[] {
  return db.$client
    .prepare<[], PlanRow>(
      `SELECT id, planned_load_g AS plannedLoadG, target_reps AS targetReps,
         target_seconds AS targetSeconds FROM workout_sets ORDER BY id`,
    )
    .all()
}

describe('Given sets recorded before the frozen plan (ADR-033)', () => {
  let db: Database | undefined
  let folder: string | undefined

  afterEach(() => {
    db?.$client.close()
    if (folder) rmSync(folder, { recursive: true, force: true })
  })

  describe('When the migration of the frozen plan runs', () => {
    it('Then each set takes the current plan of its exercise, and a set with no plan stays null', () => {
      db = openDatabase(':memory:')
      folder = migrateBeforePlan(db)
      givenOldSets(db)

      runMigrations(db)

      expect(readPlans(db)).toEqual([
        { id: 'set-bench', plannedLoadG: 40000, targetReps: 10, targetSeconds: null },
        { id: 'set-plank', plannedLoadG: 0, targetReps: null, targetSeconds: 60 },
        { id: 'set-row', plannedLoadG: null, targetReps: null, targetSeconds: null },
      ])
    })

    it('Then the sets keep their values and their links', () => {
      db = openDatabase(':memory:')
      folder = migrateBeforePlan(db)
      givenOldSets(db)

      runMigrations(db)

      const rows = db.$client
        .prepare<[], { id: string; plannedExerciseId: string | null; loadG: number }>(
          `SELECT id, planned_exercise_id AS plannedExerciseId, load_g AS loadG
             FROM workout_sets ORDER BY id`,
        )
        .all()
      expect(rows).toEqual([
        { id: 'set-bench', plannedExerciseId: 'planned-bench', loadG: 42500 },
        { id: 'set-plank', plannedExerciseId: 'planned-plank', loadG: 0 },
        { id: 'set-row', plannedExerciseId: null, loadG: 30000 },
      ])
    })
  })

  describe('When a set is stored with a load plan but no target', () => {
    it('Then the database refuses it', () => {
      db = openDatabase(':memory:')
      runMigrations(db)
      givenOldSets(db)

      const store = () =>
        db?.$client.exec(
          `UPDATE workout_sets SET planned_load_g = 40000, target_reps = NULL, target_seconds = NULL
             WHERE id = 'set-row'`,
        )

      expect(store).toThrow(/workout_sets_plan_check/)
    })
  })
})
