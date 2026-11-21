import { and, asc, desc, eq, inArray, isNull, max } from 'drizzle-orm'
import type { Database } from '../../db/connection.js'
import { exercises, plannedExercises, programDays, programs } from '../../db/schema.js'
import type { Goal, PlannedExercise } from './programs.schemas.js'

export type NewProgram = {
  id: string
  name: string
  goal: Goal
  createdAt: string
}

export type ProgramRow = NewProgram & { isActive: boolean }

export type NewProgramDay = {
  id: string
  programId: string
  letter: string
  label: string | null
}

export type ProgramDayRow = NewProgramDay & { position: number }

export type ExerciseRow = PlannedExercise['exercise']

export type NewPlannedExercise = {
  id: string
  programDayId: string
  exerciseId: string
  sets: number
  targetReps: number | null
  targetSeconds: number | null
  loadG: number
  restSeconds: number
}

export type PlannedExerciseRow = PlannedExercise & { programDayId: string }

const programColumns = {
  id: programs.id,
  name: programs.name,
  goal: programs.goal,
  isActive: programs.isActive,
  createdAt: programs.createdAt,
}

const programDayColumns = {
  id: programDays.id,
  programId: programDays.programId,
  letter: programDays.letter,
  label: programDays.label,
  position: programDays.position,
}

// Deactivating and inserting share one transaction, so a failed insert keeps the previous active.
export function insertActiveProgram(db: Database, program: NewProgram): void {
  db.transaction((tx) => {
    tx.update(programs).set({ isActive: false }).where(eq(programs.isActive, true)).run()
    tx.insert(programs)
      .values({ ...program, isActive: true })
      .run()
  })
}

// Deactivate first: the partial unique index refuses two active programs at once.
export function markProgramActive(db: Database, programId: string): void {
  db.update(programs).set({ isActive: false }).where(eq(programs.isActive, true)).run()
  db.update(programs).set({ isActive: true }).where(eq(programs.id, programId)).run()
}

export function updateProgramRow(
  db: Database,
  programId: string,
  changes: Partial<Pick<NewProgram, 'name' | 'goal'>>,
): void {
  db.update(programs).set(changes).where(eq(programs.id, programId)).run()
}

export function findProgramRow(db: Database, programId: string): ProgramRow | undefined {
  return db.select(programColumns).from(programs).where(eq(programs.id, programId)).get()
}

export function findActiveProgramRow(db: Database): ProgramRow | undefined {
  return db.select(programColumns).from(programs).where(eq(programs.isActive, true)).get()
}

export function listProgramRows(db: Database): ProgramRow[] {
  return db
    .select(programColumns)
    .from(programs)
    .orderBy(desc(programs.isActive), desc(programs.createdAt), desc(programs.id))
    .all()
}

export function findProgramDayRow(
  db: Database,
  programId: string,
  letter: string,
): ProgramDayRow | undefined {
  return db
    .select(programDayColumns)
    .from(programDays)
    .where(and(eq(programDays.programId, programId), eq(programDays.letter, letter)))
    .get()
}

// Call inside the service transaction so the next position cannot be taken in between.
export function insertProgramDay(db: Database, day: NewProgramDay): void {
  const last = db
    .select({ position: max(programDays.position) })
    .from(programDays)
    .where(eq(programDays.programId, day.programId))
    .get()
  db.insert(programDays)
    .values({ ...day, position: (last?.position ?? 0) + 1 })
    .run()
}

export function updateProgramDayLabel(
  db: Database,
  programDayId: string,
  label: string | null,
): void {
  db.update(programDays).set({ label }).where(eq(programDays.id, programDayId)).run()
}

// Planned exercises of the day go by ON DELETE CASCADE; positions are not renumbered.
export function deleteProgramDay(db: Database, programDayId: string): void {
  db.delete(programDays).where(eq(programDays.id, programDayId)).run()
}

export function listProgramDayRows(db: Database, programIds: readonly string[]): ProgramDayRow[] {
  return db
    .select(programDayColumns)
    .from(programDays)
    .where(inArray(programDays.programId, [...programIds]))
    .orderBy(asc(programDays.position))
    .all()
}

export function findActiveExerciseBySlug(db: Database, slug: string): ExerciseRow | undefined {
  return db
    .select({ id: exercises.id, slug: exercises.slug, name: exercises.name, kind: exercises.kind })
    .from(exercises)
    .where(and(eq(exercises.slug, slug), isNull(exercises.archivedAt)))
    .get()
}

export function existsPlannedExercise(
  db: Database,
  programDayId: string,
  exerciseId: string,
): boolean {
  return (
    db
      .select({ id: plannedExercises.id })
      .from(plannedExercises)
      .where(
        and(
          eq(plannedExercises.programDayId, programDayId),
          eq(plannedExercises.exerciseId, exerciseId),
        ),
      )
      .get() !== undefined
  )
}

// Call inside the service transaction so the next position cannot be taken in between.
export function insertPlannedExercise(db: Database, planned: NewPlannedExercise): void {
  const last = db
    .select({ position: max(plannedExercises.position) })
    .from(plannedExercises)
    .where(eq(plannedExercises.programDayId, planned.programDayId))
    .get()
  db.insert(plannedExercises)
    .values({ ...planned, position: (last?.position ?? 0) + 1 })
    .run()
}

export function listPlannedExerciseRows(
  db: Database,
  programDayIds: readonly string[],
): PlannedExerciseRow[] {
  return db
    .select({
      programDayId: plannedExercises.programDayId,
      exercise: {
        id: exercises.id,
        slug: exercises.slug,
        name: exercises.name,
        kind: exercises.kind,
      },
      sets: plannedExercises.sets,
      targetReps: plannedExercises.targetReps,
      targetSeconds: plannedExercises.targetSeconds,
      loadG: plannedExercises.loadG,
      restSeconds: plannedExercises.restSeconds,
    })
    .from(plannedExercises)
    .innerJoin(exercises, eq(plannedExercises.exerciseId, exercises.id))
    .where(inArray(plannedExercises.programDayId, [...programDayIds]))
    .orderBy(asc(plannedExercises.position))
    .all()
}

export type PlannedExerciseRef = { id: string; exercise: ExerciseRow }

export type PlannedExerciseChanges = Partial<
  Pick<NewPlannedExercise, 'sets' | 'targetReps' | 'targetSeconds' | 'loadG' | 'restSeconds'>
>

// No archived filter: an exercise archived after it joined the plan stays editable.
export function findPlannedExerciseRow(
  db: Database,
  programDayId: string,
  exerciseSlug: string,
): PlannedExerciseRef | undefined {
  return db
    .select({
      id: plannedExercises.id,
      exercise: {
        id: exercises.id,
        slug: exercises.slug,
        name: exercises.name,
        kind: exercises.kind,
      },
    })
    .from(plannedExercises)
    .innerJoin(exercises, eq(plannedExercises.exerciseId, exercises.id))
    .where(and(eq(plannedExercises.programDayId, programDayId), eq(exercises.slug, exerciseSlug)))
    .get()
}

export function updatePlannedExerciseRow(
  db: Database,
  plannedExerciseId: string,
  changes: PlannedExerciseChanges,
): void {
  db.update(plannedExercises).set(changes).where(eq(plannedExercises.id, plannedExerciseId)).run()
}

export function deletePlannedExercise(db: Database, plannedExerciseId: string): void {
  db.delete(plannedExercises).where(eq(plannedExercises.id, plannedExerciseId)).run()
}
