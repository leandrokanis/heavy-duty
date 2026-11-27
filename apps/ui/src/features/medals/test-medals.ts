import type { Medal } from './medals.types'

export const medal = (params: Partial<Medal>): Medal => ({
  code: 'first_record',
  name: 'Primeiro recorde',
  criterion: 'Registre a primeira série recorde.',
  icon: 'sparkle',
  hidden: false,
  awardedAt: null,
  subject: null,
  workoutId: null,
  ...params,
})

export const LEVEL_10_IN_CHEST = medal({
  code: 'level_10',
  name: 'Nível 10',
  criterion: 'Leve um grupo muscular ao nível 10.',
  icon: 'shield',
  awardedAt: '2026-12-03T21:40:00.000Z',
  subject: { slug: 'chest', name: 'peito' },
})

export const HIDDEN = medal({
  code: 'window_saved_at_end',
  name: null,
  criterion: null,
  icon: null,
  hidden: true,
})
