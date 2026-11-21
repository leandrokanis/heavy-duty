import { sql } from 'drizzle-orm'
import {
  blob,
  check,
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  unique,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core'

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

export const authCredentials = sqliteTable(
  'auth_credentials',
  {
    id: text('id').primaryKey(),
    credentialId: text('credential_id').notNull().unique(),
    publicKey: blob('public_key', { mode: 'buffer' }).notNull(),
    counter: integer('counter').notNull(),
    transports: text('transports'),
    createdAt: text('created_at').notNull(),
    lastUsedAt: text('last_used_at'),
  },
  (table) => [check('auth_credentials_counter_check', sql`${table.counter} >= 0`)],
)

export const authSessions = sqliteTable('auth_sessions', {
  id: text('id').primaryKey(),
  tokenHash: text('token_hash').notNull().unique(),
  createdAt: text('created_at').notNull(),
  expiresAt: text('expires_at').notNull(),
  lastSeenAt: text('last_seen_at').notNull(),
})

export const enrollmentTokens = sqliteTable('enrollment_tokens', {
  id: text('id').primaryKey(),
  tokenHash: text('token_hash').notNull().unique(),
  createdAt: text('created_at').notNull(),
  expiresAt: text('expires_at').notNull(),
  usedAt: text('used_at'),
})

export const programs = sqliteTable(
  'programs',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    goal: text('goal', { enum: ['strength', 'hypertrophy', 'endurance'] }).notNull(),
    isActive: integer('is_active', { mode: 'boolean' }).notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => [
    check('programs_goal_check', sql`${table.goal} IN ('strength', 'hypertrophy', 'endurance')`),
    uniqueIndex('programs_single_active_idx').on(table.isActive).where(sql`${table.isActive} = 1`),
  ],
)

export const programDays = sqliteTable(
  'program_days',
  {
    id: text('id').primaryKey(),
    programId: text('program_id')
      .notNull()
      .references(() => programs.id, { onDelete: 'cascade' }),
    letter: text('letter').notNull(),
    label: text('label'),
    position: integer('position').notNull(),
  },
  (table) => [
    check('program_days_letter_check', sql`${table.letter} GLOB '[A-Z]'`),
    unique('program_days_program_letter_unique').on(table.programId, table.letter),
    unique('program_days_program_position_unique').on(table.programId, table.position),
  ],
)

export const plannedExercises = sqliteTable(
  'planned_exercises',
  {
    id: text('id').primaryKey(),
    programDayId: text('program_day_id')
      .notNull()
      .references(() => programDays.id, { onDelete: 'cascade' }),
    exerciseId: text('exercise_id')
      .notNull()
      .references(() => exercises.id, { onDelete: 'restrict' }),
    position: integer('position').notNull(),
    sets: integer('sets').notNull(),
    targetReps: integer('target_reps'),
    targetSeconds: integer('target_seconds'),
    loadG: integer('load_g').notNull(),
    restSeconds: integer('rest_seconds').notNull(),
  },
  (table) => [
    check('planned_exercises_sets_check', sql`${table.sets} >= 1`),
    check(
      'planned_exercises_target_reps_check',
      sql`${table.targetReps} IS NULL OR ${table.targetReps} >= 1`,
    ),
    check(
      'planned_exercises_target_seconds_check',
      sql`${table.targetSeconds} IS NULL OR ${table.targetSeconds} >= 1`,
    ),
    check(
      'planned_exercises_single_target_check',
      sql`(${table.targetReps} IS NULL) <> (${table.targetSeconds} IS NULL)`,
    ),
    check('planned_exercises_load_g_check', sql`${table.loadG} >= 0`),
    check('planned_exercises_rest_seconds_check', sql`${table.restSeconds} >= 0`),
    unique('planned_exercises_day_position_unique').on(table.programDayId, table.position),
    unique('planned_exercises_day_exercise_unique').on(table.programDayId, table.exerciseId),
    index('planned_exercises_exercise_idx').on(table.exerciseId),
  ],
)

// The workout copies program_id and letter, so removing the day keeps what was trained (FR-009).
export const workouts = sqliteTable(
  'workouts',
  {
    id: text('id').primaryKey(),
    programId: text('program_id')
      .notNull()
      .references(() => programs.id, { onDelete: 'restrict' }),
    programDayId: text('program_day_id').references(() => programDays.id, {
      onDelete: 'set null',
    }),
    letter: text('letter').notNull(),
    startedAt: text('started_at').notNull(),
    finishedAt: text('finished_at'),
    endReason: text('end_reason', { enum: ['completed', 'ended_early'] }),
  },
  (table) => [
    check('workouts_letter_check', sql`${table.letter} GLOB '[A-Z]'`),
    check(
      'workouts_end_reason_check',
      sql`${table.endReason} IS NULL OR ${table.endReason} IN ('completed', 'ended_early')`,
    ),
    index('workouts_program_idx').on(table.programId),
    index('workouts_program_day_idx').on(table.programDayId),
  ],
)

export const workoutSets = sqliteTable(
  'workout_sets',
  {
    id: text('id').primaryKey(),
    workoutId: text('workout_id')
      .notNull()
      .references(() => workouts.id, { onDelete: 'cascade' }),
    exerciseId: text('exercise_id')
      .notNull()
      .references(() => exercises.id, { onDelete: 'restrict' }),
    plannedExerciseId: text('planned_exercise_id').references(() => plannedExercises.id, {
      onDelete: 'set null',
    }),
    setNumber: integer('set_number').notNull(),
    loadG: integer('load_g').notNull(),
    reps: integer('reps'),
    seconds: integer('seconds'),
    performedAt: text('performed_at').notNull(),
    correctedAt: text('corrected_at'),
  },
  (table) => [
    check('workout_sets_set_number_check', sql`${table.setNumber} >= 1`),
    check('workout_sets_load_g_check', sql`${table.loadG} >= 0`),
    check('workout_sets_reps_check', sql`${table.reps} IS NULL OR ${table.reps} >= 1`),
    check('workout_sets_seconds_check', sql`${table.seconds} IS NULL OR ${table.seconds} >= 1`),
    check(
      'workout_sets_single_measure_check',
      sql`(${table.reps} IS NULL) <> (${table.seconds} IS NULL)`,
    ),
    index('workout_sets_workout_idx').on(table.workoutId),
    index('workout_sets_exercise_idx').on(table.exerciseId),
    index('workout_sets_planned_exercise_idx').on(table.plannedExerciseId),
  ],
)
