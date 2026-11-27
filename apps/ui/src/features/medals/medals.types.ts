// Mirror of MedalsSchema in apps/api/src/modules/medals/medals.schemas.ts.
export type MedalIcon =
  | 'sparkle'
  | 'bolt'
  | 'target'
  | 'flame'
  | 'shield'
  | 'medal'
  | 'trophy'
  | 'star'

export type Medal = {
  code: string
  // Null on a hidden medal not yet awarded (ADR-040).
  name: string | null
  criterion: string | null
  icon: MedalIcon | null
  hidden: boolean
  awardedAt: string | null
  subject: { slug: string; name: string } | null
  workoutId: string | null
}

export type Medals = { now: string; medals: Medal[] }
