import type { GameParameters } from './windows.config.js'

export type VolumeSet = {
  loadG: number
  reps: number | null
  seconds: number | null
  primaryGroupSlugs: string[]
  secondaryGroupSlugs: string[]
}

export type GroupVolume = { volumeG: number; timeSeconds: number }

export function volumeByMuscleGroup(
  sets: VolumeSet[],
  parameters: GameParameters,
): Map<string, GroupVolume> {
  const volumes = new Map<string, GroupVolume>()
  const add = (slug: string, set: VolumeSet, percent: number) => {
    const current = volumes.get(slug) ?? { volumeG: 0, timeSeconds: 0 }
    current.volumeG += Math.floor((set.loadG * (set.reps ?? 0) * percent) / 100)
    current.timeSeconds += Math.floor(((set.seconds ?? 0) * percent) / 100)
    volumes.set(slug, current)
  }
  for (const set of sets) {
    const primary = new Set(set.primaryGroupSlugs)
    const secondary = new Set(set.secondaryGroupSlugs)
    for (const slug of primary) {
      add(slug, set, 100)
    }
    for (const slug of secondary) {
      if (!primary.has(slug)) {
        add(slug, set, parameters.secondaryVolumePercent)
      }
    }
  }
  return volumes
}
