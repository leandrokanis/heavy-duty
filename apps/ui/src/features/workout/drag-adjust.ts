import { formatLoadKg } from './format'

export type AdjustField = 'loadG' | 'reps' | 'seconds'

export const DRAG_STEPS: Record<AdjustField, number> = { loadG: 2_500, reps: 1, seconds: 5 }

export const MINIMUMS: Record<AdjustField, number> = { loadG: 0, reps: 1, seconds: 1 }

// Integer math in the smallest unit; the sum stops at the minimum and at the safe integer the API takes.
export function adjustValue(field: AdjustField, value: number, steps: number): number {
  const adjusted = value + steps * DRAG_STEPS[field]
  return Math.min(Number.MAX_SAFE_INTEGER, Math.max(MINIMUMS[field], adjusted))
}

// Rounds half a step away from zero, so the same drag up or down moves the same number of steps.
export function stepsFromDrag(deltaY: number, stepPx: number): number {
  return Math.sign(deltaY) * Math.round(Math.abs(deltaY) / stepPx) + 0
}

export function formatFieldValue(field: AdjustField, value: number): string {
  return field === 'loadG' ? formatLoadKg(value) : String(value)
}

const UNIT_WORDS: Record<AdjustField, { singular: string; plural: string }> = {
  loadG: { singular: 'quilo', plural: 'quilos' },
  reps: { singular: 'repetição', plural: 'repetições' },
  seconds: { singular: 'segundo', plural: 'segundos' },
}

const UNIT_SIZES: Record<AdjustField, number> = { loadG: 1_000, reps: 1, seconds: 1 }

// The spoken value takes the singular from 1 up to below 2, as the standard Portuguese does.
export function valueTextOf(field: AdjustField, value: number): string {
  const unit = UNIT_SIZES[field]
  const { singular, plural } = UNIT_WORDS[field]
  const word = value >= unit && value < 2 * unit ? singular : plural
  return `${formatFieldValue(field, value)} ${word}`
}
