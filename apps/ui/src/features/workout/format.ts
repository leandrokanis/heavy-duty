const GRAMS_PER_KG = 1000
const SECONDS_PER_MINUTE = 60

// Integer arithmetic keeps 42500 g as "42,5" without floating point drift.
export function formatLoadKg(loadG: number): string {
  const kg = Math.trunc(loadG / GRAMS_PER_KG)
  const grams = loadG % GRAMS_PER_KG
  if (grams === 0) return String(kg)
  const fraction = String(grams).padStart(3, '0').replace(/0+$/, '')
  return `${kg},${fraction}`
}

export function formatDurationMinutes(seconds: number): string {
  return `${Math.max(1, Math.round(seconds / SECONDS_PER_MINUTE))} min`
}

export function formatRestClock(seconds: number): string {
  const minutes = Math.floor(seconds / SECONDS_PER_MINUTE)
  return `${minutes}:${String(seconds % SECONDS_PER_MINUTE).padStart(2, '0')}`
}

// The short form of a set on the screen: "42,5 kg · 10 rep" or "0 kg · 45 s".
export function formatSetShort(set: { loadG: number; reps?: number; seconds?: number }): string {
  const measure = set.reps === undefined ? `${set.seconds} s` : `${set.reps} rep`
  return `${formatLoadKg(set.loadG)} kg · ${measure}`
}

const MS_PER_SECOND = 1000
const SECONDS_PER_HOUR = 3600

// The total time of the workout: "9:05", and "1:02:03" from one hour on.
export function formatElapsedClock(elapsedMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(elapsedMs / MS_PER_SECOND))
  const hours = Math.floor(totalSeconds / SECONDS_PER_HOUR)
  const minutes = Math.floor((totalSeconds % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE)
  const seconds = String(totalSeconds % SECONDS_PER_MINUTE).padStart(2, '0')
  if (hours === 0) return `${minutes}:${seconds}`
  return `${hours}:${String(minutes).padStart(2, '0')}:${seconds}`
}
