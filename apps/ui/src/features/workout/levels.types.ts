// Mirror of MuscleGroupLevelsSchema in apps/api/src/modules/windows/windows.schemas.ts.
export type Tier = 'bronze' | 'silver' | 'gold' | 'violet'

export type MuscleGroupLevel = {
  muscleGroup: { slug: string; name: string }
  level: number
  points: number
  levelCost: number
  bestLevel: number
  tier: Tier
  // Absent from a copy saved on the device before US-F10-03.
  cooling?: boolean
  nextDropAt?: string | null
}

export type MuscleGroupLevels = { now: string; groups: MuscleGroupLevel[] }
