import type { MuscleGroupLevel } from '@/features/workout/levels.types'
import type { GroupWindow } from '@/features/workout/windows.types'

const HOUR_MS = 3_600_000

// Monday 2026-11-23, 09:00 in Sao Paulo.
export const NOW_MS = Date.parse('2026-11-23T12:00:00.000Z')
export const SAO_PAULO = 'America/Sao_Paulo'

export const CATALOG = [
  { slug: 'chest', name: 'peito' },
  { slug: 'back', name: 'costas' },
  { slug: 'lower-back', name: 'lombar' },
  { slug: 'shoulders', name: 'ombros' },
  { slug: 'biceps', name: 'bíceps' },
  { slug: 'triceps', name: 'tríceps' },
  { slug: 'abs', name: 'abdômen' },
  { slug: 'quadriceps', name: 'quadríceps' },
  { slug: 'hamstrings', name: 'posteriores de coxa' },
  { slug: 'glutes', name: 'glúteos' },
  { slug: 'calves', name: 'panturrilhas' },
] as const

const iso = (ms: number) => new Date(ms).toISOString()

// A window from the opening and the closing, in hours from now; null for a group never trained.
export function groupWindow(
  slug: string,
  hours: { opensIn: number; closesIn: number; trainedAgo?: number } | null,
): GroupWindow {
  const muscleGroup = CATALOG.find((group) => group.slug === slug) ?? { slug, name: slug }
  if (hours === null) {
    return { muscleGroup, state: 'none', lastTrainedAt: null, opensAt: null, closesAt: null }
  }
  return {
    muscleGroup,
    state: 'resting',
    lastTrainedAt: iso(NOW_MS - (hours.trainedAgo ?? 48) * HOUR_MS),
    opensAt: iso(NOW_MS + hours.opensIn * HOUR_MS),
    closesAt: iso(NOW_MS + hours.closesIn * HOUR_MS),
  }
}

export function groupLevel(
  slug: string,
  values: Partial<Omit<MuscleGroupLevel, 'muscleGroup'>> = {},
): MuscleGroupLevel {
  const muscleGroup = CATALOG.find((group) => group.slug === slug) ?? { slug, name: slug }
  return {
    muscleGroup,
    level: 6,
    points: 26,
    levelCost: 55,
    bestLevel: 6,
    tier: 'silver',
    cooling: false,
    nextDropAt: null,
    muscleMemory: false,
    ...values,
  }
}
