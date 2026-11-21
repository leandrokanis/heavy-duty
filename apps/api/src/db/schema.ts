import { sql } from 'drizzle-orm'
import { check, integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: text('updated_at').notNull(),
})

export const muscleGroups = sqliteTable('muscle_groups', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  position: integer('position').notNull(),
})

export const muscles = sqliteTable('muscles', {
  id: text('id').primaryKey(),
  muscleGroupId: text('muscle_group_id')
    .notNull()
    .references(() => muscleGroups.id, { onDelete: 'restrict' }),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
})

export const exercises = sqliteTable(
  'exercises',
  {
    id: text('id').primaryKey(),
    slug: text('slug').notNull().unique(),
    name: text('name').notNull(),
    kind: text('kind', { enum: ['reps', 'time'] }).notNull(),
    archivedAt: text('archived_at'),
  },
  (table) => [check('exercises_kind_check', sql`${table.kind} IN ('reps', 'time')`)],
)

export const exerciseMuscles = sqliteTable(
  'exercise_muscles',
  {
    exerciseId: text('exercise_id')
      .notNull()
      .references(() => exercises.id, { onDelete: 'cascade' }),
    muscleId: text('muscle_id')
      .notNull()
      .references(() => muscles.id, { onDelete: 'restrict' }),
    role: text('role', { enum: ['primary', 'secondary'] }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.exerciseId, table.muscleId] }),
    check('exercise_muscles_role_check', sql`${table.role} IN ('primary', 'secondary')`),
  ],
)

export const backupRuns = sqliteTable(
  'backup_runs',
  {
    id: text('id').primaryKey(),
    startedAt: text('started_at').notNull(),
    finishedAt: text('finished_at').notNull(),
    status: text('status', { enum: ['succeeded', 'failed'] }).notNull(),
    sizeBytes: integer('size_bytes'),
    error: text('error'),
  },
  (table) => [
    check('backup_runs_status_check', sql`${table.status} IN ('succeeded', 'failed')`),
    check(
      'backup_runs_size_bytes_check',
      sql`${table.sizeBytes} IS NULL OR ${table.sizeBytes} >= 0`,
    ),
  ],
)
