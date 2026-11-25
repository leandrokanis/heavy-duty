import { describe, expect, it } from 'vitest'
import {
  CHEST,
  SUPINO_RETO,
  TRICEPS_POLIA,
  todayBody,
  todayDay,
} from '@/features/workout/test-today'
import type { ActivityWindows } from '@/features/workout/windows.types'
import { bodyMapOf, figureStateOf, stateTextOf } from './body-map'
import { CATALOG, groupLevel, groupWindow, NOW_MS, SAO_PAULO } from './test-body-map'

const windowsOf = (groups: ActivityWindows['groups']): ActivityWindows => ({
  now: new Date(NOW_MS).toISOString(),
  groups,
})

describe('Given the windows of the 11 groups of the catalog', () => {
  const windows = windowsOf(
    CATALOG.map(({ slug }) => {
      if (slug === 'chest') return groupWindow(slug, { opensIn: -20, closesIn: 82 })
      if (slug === 'back') return groupWindow(slug, { opensIn: 24, closesIn: 144 })
      if (slug === 'quadriceps') return groupWindow(slug, { opensIn: -170, closesIn: -50 })
      return groupWindow(slug, null)
    }),
  )

  describe('When the body map is built with the clock of the device', () => {
    it('Then should list the 11 groups in the order of the catalog with the state of each', () => {
      const groups = bodyMapOf(windows, null, null, NOW_MS)

      expect(groups.map(({ slug, state }) => [slug, state])).toEqual(
        CATALOG.map(({ slug }) => [
          slug,
          { chest: 'open', back: 'resting', quadriceps: 'cooling' }[slug as string] ?? 'none',
        ]),
      )
    })

    it('Then should take the state from the clock, not from the stored state', () => {
      const [chest] = bodyMapOf(windows, null, null, NOW_MS + 83 * 3_600_000)

      expect(chest?.state).toBe('cooling')
    })
  })

  describe('When the levels are known', () => {
    it('Then each group should carry its own level', () => {
      const levels = { now: windows.now, groups: [groupLevel('back', { level: 9 })] }

      const groups = bodyMapOf(windows, levels, null, NOW_MS)

      expect(groups.map(({ level }) => level?.level ?? null).slice(0, 2)).toEqual([null, 9])
    })
  })
})

describe('Given a program whose letters train chest and triceps as primary groups', () => {
  const today = todayBody([todayDay('A', null, [SUPINO_RETO, TRICEPS_POLIA])])
  const windows = windowsOf(CATALOG.map(({ slug }) => groupWindow(slug, null)))

  describe('When the body map is built', () => {
    it('Then only chest and triceps should be in the program', () => {
      const groups = bodyMapOf(windows, null, today, NOW_MS)

      expect(groups.filter(({ inProgram }) => inProgram).map(({ slug }) => slug)).toEqual([
        CHEST.slug,
        'triceps',
      ])
    })
  })

  describe('When the workout of the day is unknown', () => {
    it('Then every group should count as in the program', () => {
      const groups = bodyMapOf(windows, null, null, NOW_MS)

      expect(groups.every(({ inProgram }) => inProgram)).toBe(true)
    })
  })
})

describe('Given no windows and the levels of the catalog', () => {
  describe('When the body map is built', () => {
    it('Then should list the groups of the levels, with no window', () => {
      const levels = { now: '', groups: CATALOG.map(({ slug }) => groupLevel(slug)) }

      const groups = bodyMapOf(null, levels, null, NOW_MS)

      expect([groups.length, groups.every(({ state }) => state === 'none')]).toEqual([11, true])
    })
  })
})

describe('Given a group in each state', () => {
  const windows = windowsOf([
    groupWindow('chest', { opensIn: -20, closesIn: 83 }),
    groupWindow('back', { opensIn: 24, closesIn: 144 }),
    groupWindow('quadriceps', { opensIn: -170, closesIn: -50 }),
    groupWindow('abs', null),
    groupWindow('calves', { opensIn: -20, closesIn: 83 }),
  ])
  const today = todayBody([
    todayDay('A', null, [
      { ...SUPINO_RETO, muscleGroups: [CHEST, { slug: 'back', name: 'costas' }] },
      { ...TRICEPS_POLIA, muscleGroups: [{ slug: 'quadriceps', name: 'quadríceps' }] },
      { ...TRICEPS_POLIA, muscleGroups: [{ slug: 'abs', name: 'abdômen' }] },
    ]),
  ])

  describe('When the text of each state is written in the time zone of the device', () => {
    it('Then should say the state and its time, or that the group is out of the program', () => {
      const groups = bodyMapOf(windows, null, today, NOW_MS)

      expect(groups.map((group) => stateTextOf(group, NOW_MS, SAO_PAULO))).toEqual([
        'Janela aberta · fecha qui 20h',
        'Descansando · abre amanhã 9h',
        'Esfriando há 2 dias',
        'Sem treino',
        'Fora do programa',
      ])
    })
  })

  describe('When the state of each part of the figure is chosen', () => {
    it('Then a group never trained or out of the program should be neutral', () => {
      const groups = bodyMapOf(windows, null, today, NOW_MS)

      expect(groups.map(figureStateOf)).toEqual([
        'open',
        'resting',
        'cooling',
        'neutral',
        'neutral',
      ])
    })
  })
})
