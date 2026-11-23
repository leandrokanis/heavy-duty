import type { MuscleGroupRef } from './today.types'
import type { ActivityWindows } from './windows.types'

export type WindowBadgeState = 'open' | 'resting' | 'cooling'

// atMs is the opening for resting, the closing for open and cooling.
export type WindowBadge = MuscleGroupRef & { state: WindowBadgeState; atMs: number }

// The state comes from the instants and the clock, not from the stored state, so an old copy stays right.
// The window is half-open: open at opensAt, closed at closesAt.
export function windowBadgesOf(
  groups: readonly MuscleGroupRef[],
  windows: ActivityWindows,
  nowMs: number,
): WindowBadge[] {
  const badges: WindowBadge[] = []
  for (const group of groups) {
    const window = windows.groups.find((listed) => listed.muscleGroup.slug === group.slug)
    if (!window?.opensAt || !window.closesAt) continue
    const opensAtMs = Date.parse(window.opensAt)
    const closesAtMs = Date.parse(window.closesAt)
    if (nowMs < opensAtMs) badges.push({ ...group, state: 'resting', atMs: opensAtMs })
    else if (nowMs < closesAtMs) badges.push({ ...group, state: 'open', atMs: closesAtMs })
    else badges.push({ ...group, state: 'cooling', atMs: closesAtMs })
  }
  return badges
}
