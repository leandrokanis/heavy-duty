// A set as the record rule reads it; reps is null on a timed set, which has no record (D59).
export type RecordSet = { loadG: number; reps: number | null }

// One record of an exercise: the top load for a reps count, or the most reps for a load.
export type PersonalRecord = { reps: number; loadG: number }

function repsSetsOf(sets: readonly RecordSet[]): PersonalRecord[] {
  return sets.flatMap(({ loadG, reps }) => (reps === null ? [] : [{ reps, loadG }]))
}

function topLoadG(records: readonly PersonalRecord[], reps: number): number | null {
  const loads = records.filter((record) => record.reps === reps).map(({ loadG }) => loadG)
  return loads.length === 0 ? null : Math.max(...loads)
}

function topReps(records: readonly PersonalRecord[], loadG: number): number | null {
  const reps = records.filter((record) => record.loadG === loadG).map((record) => record.reps)
  return reps.length === 0 ? null : Math.max(...reps)
}

// The union of the top load of each reps count and the most reps of each load, sorted by reps
// and load. Both lookups read the union back without loss, so it can stand in for the sets.
export function personalRecordsOf(sets: readonly RecordSet[]): PersonalRecord[] {
  const loadGByReps = new Map<number, number>()
  const repsByLoadG = new Map<number, number>()
  for (const { reps, loadG } of repsSetsOf(sets)) {
    loadGByReps.set(reps, Math.max(loadG, loadGByReps.get(reps) ?? loadG))
    repsByLoadG.set(loadG, Math.max(reps, repsByLoadG.get(loadG) ?? reps))
  }
  const unique = new Map<string, PersonalRecord>()
  for (const [reps, loadG] of loadGByReps) unique.set(`${reps}:${loadG}`, { reps, loadG })
  for (const [loadG, reps] of repsByLoadG) unique.set(`${reps}:${loadG}`, { reps, loadG })
  return [...unique.values()].sort((a, b) => a.reps - b.reps || a.loadG - b.loadG)
}

// The load to beat for a reps count; null when no set had that many reps.
export function recordLoadGFor(
  records: readonly PersonalRecord[],
  reps: number | null,
): number | null {
  return reps === null ? null : topLoadG(records, reps)
}

// A record beats one that exists: more load for the same reps, or more reps for the same load.
// With no set of the same reps nor of the same load there is nothing to beat (D59).
export function isPersonalRecord(set: RecordSet, records: readonly PersonalRecord[]): boolean {
  if (set.reps === null) return false
  const loadToBeat = topLoadG(records, set.reps)
  const repsToBeat = topReps(records, set.loadG)
  return (
    (loadToBeat !== null && set.loadG > loadToBeat) ||
    (repsToBeat !== null && set.reps > repsToBeat)
  )
}

// Each set in order against the past records and the sets before it in the list (D59).
export function personalRecordFlags(
  records: readonly PersonalRecord[],
  sets: readonly RecordSet[],
): boolean[] {
  return sets.map((set, index) =>
    isPersonalRecord(set, personalRecordsOf([...records, ...sets.slice(0, index)])),
  )
}
