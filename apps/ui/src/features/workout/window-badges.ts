import { windowStateAt } from '@heavy-duty/game'
import type { MuscleGroupRef } from './today.types'
import type { ActivityWindows } from './windows.types'

export type WindowBadgeState = 'open' | 'resting' | 'cooling'

// atMs is the opening for resting, the closing for open and cooling.
export type WindowBadge = MuscleGroupRef & { state: WindowBadgeState; atMs: number }

// The state comes from the instants and the clock, not from the stored state, so an old copy stays right.
export function windowBadgesOf(
  groups: readonly MuscleGroupRef[],
  windows: ActivityWindows,
  nowMs: number,
): WindowBadge[] {
  const badges: WindowBadge[] = []
  for (const group of groups) {
    const window = windows.groups.find((listed) => listed.muscleGroup.slug === group.slug)
    const state = windowStateAt(window, nowMs)
    if (!window?.opensAt || !window.closesAt || state === 'none') continue
    const atMs = Date.parse(state === 'resting' ? window.opensAt : window.closesAt)
    badges.push({ ...group, state, atMs })
  }
  return badges
}
