import { windowStateAt } from '@heavy-duty/game'
import type { MuscleGroupLevel, MuscleGroupLevels } from '@/features/workout/levels.types'
import type { MuscleGroupRef, Today } from '@/features/workout/today.types'
import { formatCoolingFor, formatWindowWhen } from '@/features/workout/window-format'
import type { ActivityWindows, GroupWindow, WindowState } from '@/features/workout/windows.types'
import { muscleGroupsOfDay } from '@/shared/muscle-groups-of-day'

export type BodyMapGroup = MuscleGroupRef & {
  state: WindowState
  // Out of the primary groups of the letters of the active program (D67): grey on the map.
  inProgram: boolean
  opensAtMs: number | null
  closesAtMs: number | null
  lastTrainedAtMs: number | null
  // Null while the levels are unknown.
  level: MuscleGroupLevel | null
}

export type FigureState = 'open' | 'resting' | 'cooling' | 'neutral'

function msOf(instant: string | null | undefined): number | null {
  return instant ? Date.parse(instant) : null
}

// Unknown with no copy of the workout of the day, so no group turns grey by mistake.
function programGroupsOf(today: Today | null): ReadonlySet<string> | null {
  if (today === null) return null
  return new Set(today.days.flatMap((day) => muscleGroupsOfDay(day).map(({ slug }) => slug)))
}

// The groups come in the order of the catalog, as the API lists them; the state comes from the
// instants and the clock of the device, so an old copy stays right (ADR-034).
export function bodyMapOf(
  windows: ActivityWindows | null,
  levels: MuscleGroupLevels | null,
  today: Today | null,
  nowMs: number,
): BodyMapGroup[] {
  const catalog = (windows?.groups ?? levels?.groups ?? []).map(({ muscleGroup }) => muscleGroup)
  const programGroups = programGroupsOf(today)
  return catalog.map(({ slug, name }) => {
    const window: GroupWindow | undefined = windows?.groups.find(
      ({ muscleGroup }) => muscleGroup.slug === slug,
    )
    return {
      slug,
      name,
      state: windowStateAt(window, nowMs),
      inProgram: programGroups?.has(slug) ?? true,
      opensAtMs: msOf(window?.opensAt),
      closesAtMs: msOf(window?.closesAt),
      lastTrainedAtMs: msOf(window?.lastTrainedAt),
      level: levels?.groups.find(({ muscleGroup }) => muscleGroup.slug === slug) ?? null,
    }
  })
}

// The text beside the indicator, so the state never depends on the colour alone (US-F08-01).
export function stateTextOf(group: BodyMapGroup, nowMs: number, timeZone?: string): string {
  if (!group.inProgram) return 'Fora do programa'
  const { state, opensAtMs, closesAtMs } = group
  if (state === 'open' && closesAtMs !== null) {
    return `Janela aberta · fecha ${formatWindowWhen(closesAtMs, nowMs, timeZone)}`
  }
  if (state === 'resting' && opensAtMs !== null) {
    return `Descansando · abre ${formatWindowWhen(opensAtMs, nowMs, timeZone)}`
  }
  if (state === 'cooling' && closesAtMs !== null) {
    return `Esfriando ${formatCoolingFor(closesAtMs, nowMs)}`
  }
  return 'Sem treino'
}

export function figureStateOf(group: BodyMapGroup): FigureState {
  return group.inProgram && group.state !== 'none' ? group.state : 'neutral'
}
