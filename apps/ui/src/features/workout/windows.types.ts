// Mirror of ActivityWindowsSchema in apps/api/src/modules/windows/windows.schemas.ts.
export type WindowState = 'resting' | 'open' | 'cooling' | 'none'

export type GroupWindow = {
  muscleGroup: { slug: string; name: string }
  state: WindowState
  lastTrainedAt: string | null
  opensAt: string | null
  closesAt: string | null
}

export type ActivityWindows = { now: string; groups: GroupWindow[] }
