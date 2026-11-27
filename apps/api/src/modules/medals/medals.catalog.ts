import { NOTICE_CONFIG } from '../notifications/notices.config.js'

export type MedalCode =
  | 'first_record'
  | 'first_window'
  | 'weekly_goal'
  | 'week_streak_4'
  | 'level_10'
  | 'level_20'
  | 'volume_up_20'
  | 'full_period'
  | 'all_letters_in_week'
  | 'window_saved_at_end'

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
  code: MedalCode
  name: string
  criterion: string
  icon: MedalIcon
  hidden: boolean
}

// D103 (Q17). A threshold changes only for the medals not yet awarded: an award
// is stored and never removed (ADR-040).
export const MEDAL_THRESHOLDS = {
  weekStreak: 4,
  levels: { level_10: 10, level_20: 20 },
  volumePercentOverFirstWeek: 120,
  periodWeeks: 12,
  // With one letter, the first workout of each week would award it.
  minProgramLetters: 2,
  // D79: the lead of the close notice.
  savedBeforeCloseHours: NOTICE_CONFIG.leadHours.window_close,
} as const

export const MEDAL_CATALOG: readonly Medal[] = [
  {
    code: 'first_record',
    name: 'Primeiro recorde',
    criterion: 'Registre a primeira série recorde.',
    icon: 'sparkle',
    hidden: false,
  },
  {
    code: 'first_window',
    name: 'Primeira janela',
    criterion: 'Treine um grupo muscular dentro da janela.',
    icon: 'bolt',
    hidden: false,
  },
  {
    code: 'weekly_goal',
    name: 'Meta da semana',
    criterion: 'Cumpra a meta semanal de janelas.',
    icon: 'target',
    hidden: false,
  },
  {
    code: 'week_streak_4',
    name: '4 semanas seguidas',
    criterion: 'Cumpra a meta semanal em 4 semanas seguidas.',
    icon: 'flame',
    hidden: false,
  },
  {
    code: 'level_10',
    name: 'Nível 10',
    criterion: 'Leve um grupo muscular ao nível 10.',
    icon: 'shield',
    hidden: false,
  },
  {
    code: 'level_20',
    name: 'Nível 20',
    criterion: 'Leve um grupo muscular ao nível 20.',
    icon: 'shield',
    hidden: false,
  },
  {
    code: 'volume_up_20',
    name: '+20% de volume',
    criterion: 'Faça numa semana 20% mais volume que na primeira semana do período.',
    icon: 'medal',
    hidden: false,
  },
  {
    code: 'full_period',
    name: 'Período completo',
    criterion: 'Treine em todas as 12 semanas de um período.',
    icon: 'trophy',
    hidden: false,
  },
  {
    code: 'all_letters_in_week',
    name: 'Todas as letras na semana',
    criterion: 'Treine todas as letras do programa, 2 ou mais, na mesma semana.',
    icon: 'trophy',
    hidden: true,
  },
  {
    code: 'window_saved_at_end',
    name: 'Janela salva no fim',
    criterion: 'Treine um grupo nas 12 horas antes de a janela fechar.',
    icon: 'star',
    hidden: true,
  },
]
