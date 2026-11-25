import type { PlannedDay } from '@heavy-duty/game'
import { describe, expect, it } from 'vitest'
import { dueNoticesOf, type NoticesInput, type NoticeWindow, noticesOf } from './notices.rules.js'

const SAO_PAULO = 'America/Sao_Paulo'
const HOUR_MS = 60 * 60 * 1000
const at = (iso: string) => Date.parse(iso)

const GROUP_NAMES = {
  chest: 'peito',
  triceps: 'tríceps',
  back: 'costas',
  biceps: 'bíceps',
  'lower-back': 'lombar',
  quadriceps: 'quadríceps',
  calves: 'panturrilhas',
}

// Letter B trains back, biceps and lower back; C trains quadriceps the most.
const DAYS: PlannedDay[] = [
  {
    letter: 'A',
    exercises: [
      { sets: 3, muscleGroupSlugs: ['chest'] },
      { sets: 3, muscleGroupSlugs: ['triceps'] },
    ],
  },
  {
    letter: 'B',
    exercises: [
      { sets: 3, muscleGroupSlugs: ['back', 'biceps'] },
      { sets: 2, muscleGroupSlugs: ['lower-back'] },
    ],
  },
  { letter: 'C', exercises: [{ sets: 4, muscleGroupSlugs: ['quadriceps'] }] },
]

function inputAt(nowIso: string, overrides: Partial<NoticesInput> = {}): NoticesInput {
  return {
    days: DAYS,
    groupNames: GROUP_NAMES,
    windows: {},
    levels: {},
    nowMs: at(nowIso),
    timeZone: SAO_PAULO,
    ...overrides,
  }
}

// A window that opens and closes at the given instants, as the API derives from the last training.
function windowOf(opensAt: string, closesAt: string): NoticeWindow {
  return { opensAtMs: at(opensAt), closesAtMs: at(closesAt) }
}

function summaryOf(notices: ReturnType<typeof dueNoticesOf>) {
  return notices.map(({ kind, letter, groups, eventAtMs, level }) => ({
    kind,
    letter,
    groups: groups.map(({ name }) => name),
    eventAt: new Date(eventAtMs).toISOString(),
    ...(level ? { level } : {}),
  }))
}

// Tomorrow at 9h in São Paulo is 2026-11-26T12:00Z; the notice is due 12 h before, at 21h today.
const B_OPENS_TOMORROW_AT_9H = {
  back: windowOf('2026-11-26T12:00:00.000Z', '2026-11-30T12:00:00.000Z'),
  biceps: windowOf('2026-11-26T12:00:00.000Z', '2026-11-30T12:00:00.000Z'),
  'lower-back': windowOf('2026-11-26T12:00:00.000Z', '2026-11-30T12:00:00.000Z'),
}

describe('Given the window of back, biceps and lower back opens tomorrow at 9h', () => {
  describe('When it is 21h today, 12 h before', () => {
    it('Then should give one notice, of letter B, with the three groups and the opening', () => {
      const notices = dueNoticesOf(
        inputAt('2026-11-26T00:00:00.000Z', { windows: B_OPENS_TOMORROW_AT_9H }),
      )

      expect(summaryOf(notices)).toEqual([
        {
          kind: 'window_open',
          letter: 'B',
          groups: ['costas', 'bíceps', 'lombar'],
          eventAt: '2026-11-26T12:00:00.000Z',
        },
      ])
    })
  })

  describe('When it is 20h59 today, before the time of the notice', () => {
    it('Then should give no notice', () => {
      expect(
        dueNoticesOf(inputAt('2026-11-25T23:59:00.000Z', { windows: B_OPENS_TOMORROW_AT_9H })),
      ).toEqual([])
    })
  })
})

describe('Given back and biceps open tomorrow at 9h and lower back at 15h', () => {
  describe('When the notices of the program are listed', () => {
    it('Then letter B should open at 9h, when most of it is no longer resting, with back and biceps', () => {
      const windows = {
        ...B_OPENS_TOMORROW_AT_9H,
        'lower-back': windowOf('2026-11-26T18:00:00.000Z', '2026-11-30T18:00:00.000Z'),
      }

      const notices = noticesOf(inputAt('2026-11-25T13:00:00.000Z', { windows }))

      expect(summaryOf(notices)).toEqual([
        {
          kind: 'window_open',
          letter: 'B',
          groups: ['costas', 'bíceps'],
          eventAt: '2026-11-26T12:00:00.000Z',
        },
      ])
    })
  })
})

describe('Given only biceps of letter B is resting', () => {
  describe('When the notices of the program are listed', () => {
    it('Then letter B should have no opening notice, as it is already available', () => {
      const windows = {
        back: windowOf('2026-11-20T12:00:00.000Z', '2026-11-30T12:00:00.000Z'),
        biceps: windowOf('2026-11-26T12:00:00.000Z', '2026-11-30T12:00:00.000Z'),
      }

      const notices = noticesOf(inputAt('2026-11-25T13:00:00.000Z', { windows }))

      expect(notices.filter(({ kind }) => kind === 'window_open')).toEqual([])
    })
  })
})

// Today at 20h in São Paulo is 2026-11-25T23:00Z; the notice is due 12 h before, at 8h.
describe('Given the window of letter B closes today at 20h and its groups were not trained', () => {
  const windows = {
    back: windowOf('2026-11-21T23:00:00.000Z', '2026-11-25T23:00:00.000Z'),
    biceps: windowOf('2026-11-21T23:00:00.000Z', '2026-11-25T23:00:00.000Z'),
    'lower-back': windowOf('2026-11-22T23:00:00.000Z', '2026-11-26T23:00:00.000Z'),
  }

  describe('When it is 8h today', () => {
    it('Then should give one notice of letter B with the closing and the groups closing within 24 h', () => {
      const notices = dueNoticesOf(inputAt('2026-11-25T11:00:00.000Z', { windows }))

      expect(summaryOf(notices)).toEqual([
        {
          kind: 'window_close',
          letter: 'B',
          groups: ['costas', 'bíceps', 'lombar'],
          eventAt: '2026-11-25T23:00:00.000Z',
        },
      ])
    })
  })
})

describe('Given the athlete trained letter B inside its window', () => {
  describe('When the time of the closing notice comes', () => {
    it('Then should give no closing notice, as the groups rest again', () => {
      const windows = {
        back: windowOf('2026-11-26T10:00:00.000Z', '2026-11-30T10:00:00.000Z'),
        biceps: windowOf('2026-11-26T10:00:00.000Z', '2026-11-30T10:00:00.000Z'),
        'lower-back': windowOf('2026-11-26T10:00:00.000Z', '2026-11-30T10:00:00.000Z'),
      }

      const notices = dueNoticesOf(inputAt('2026-11-25T11:00:00.000Z', { windows }))

      expect(notices.filter(({ kind }) => kind === 'window_close')).toEqual([])
    })
  })
})

// The day after tomorrow at 14h in São Paulo is 2026-11-27T17:00Z; due 24 h before.
describe('Given quadriceps cools at level 7 and drops to level 6 at 14h of the day after tomorrow', () => {
  const windows = { quadriceps: windowOf('2026-11-16T12:00:00.000Z', '2026-11-20T12:00:00.000Z') }

  describe('When it is 14h tomorrow, 24 h before', () => {
    it('Then should give a drop notice with the level now, the level after and letter C', () => {
      const levels = {
        quadriceps: { level: 7, cooling: true, nextDropAtMs: at('2026-11-27T17:00:00.000Z') },
      }

      const notices = dueNoticesOf(inputAt('2026-11-26T17:00:00.000Z', { windows, levels }))

      expect(summaryOf(notices)).toEqual([
        {
          kind: 'level_drop',
          letter: 'C',
          groups: ['quadríceps'],
          eventAt: '2026-11-27T17:00:00.000Z',
          level: { now: 7, after: 6 },
        },
      ])
    })
  })

  describe('When a later drop of the same cooling is listed', () => {
    it('Then should keep the key of the first, named by the close that started the cooling', () => {
      const first = noticesOf(
        inputAt('2026-11-26T17:00:00.000Z', {
          windows,
          levels: {
            quadriceps: { level: 7, cooling: true, nextDropAtMs: at('2026-11-27T17:00:00.000Z') },
          },
        }),
      )
      const second = noticesOf(
        inputAt('2026-11-28T17:00:00.000Z', {
          windows,
          levels: {
            quadriceps: { level: 6, cooling: true, nextDropAtMs: at('2026-11-29T17:00:00.000Z') },
          },
        }),
      )

      expect(second.map(({ key }) => key)).toEqual(first.map(({ key }) => key))
    })
  })
})

describe('Given groups cooling with no drop ahead or outside the program', () => {
  describe('When the notices are listed', () => {
    it('Then should give no drop notice for level 1 nor for a group no letter trains', () => {
      const windows = {
        quadriceps: windowOf('2026-11-16T12:00:00.000Z', '2026-11-20T12:00:00.000Z'),
        calves: windowOf('2026-11-16T12:00:00.000Z', '2026-11-20T12:00:00.000Z'),
      }
      const levels = {
        quadriceps: { level: 1, cooling: true, nextDropAtMs: null },
        calves: { level: 5, cooling: true, nextDropAtMs: at('2026-11-27T17:00:00.000Z') },
      }

      expect(noticesOf(inputAt('2026-11-26T17:00:00.000Z', { windows, levels }))).toEqual([])
    })
  })
})

// 2026-11-27 at 10h in São Paulo is 13:00Z; 12 h before is 22h, inside the quiet hours.
describe('Given letter B opens at 10h, so its notice would fall at 22h', () => {
  const windows = {
    back: windowOf('2026-11-27T13:00:00.000Z', '2026-12-01T13:00:00.000Z'),
    biceps: windowOf('2026-11-27T13:00:00.000Z', '2026-12-01T13:00:00.000Z'),
  }

  describe('When the notices are listed', () => {
    it('Then the notice should go out earlier, at 21h', () => {
      const [notice] = noticesOf(inputAt('2026-11-26T13:00:00.000Z', { windows }))

      expect(new Date(notice?.dueAtMs ?? 0).toISOString()).toBe('2026-11-27T00:00:00.000Z')
    })
  })

  describe('When it is 23h, in the quiet hours, and the server missed 21h', () => {
    it('Then should give no notice', () => {
      expect(dueNoticesOf(inputAt('2026-11-27T02:00:00.000Z', { windows }))).toEqual([])
    })
  })

  describe('When it is 7h, the quiet hours are over and the event has not come', () => {
    it('Then should give the notice', () => {
      expect(
        summaryOf(dueNoticesOf(inputAt('2026-11-27T10:00:00.000Z', { windows }))).map(
          ({ kind }) => kind,
        ),
      ).toEqual(['window_open'])
    })
  })
})

describe('Given a notice due at 6h, before the quiet hours end', () => {
  describe('When it is listed', () => {
    it('Then it should go out at the 21h of the evening before', () => {
      // Opens at 18h (21:00Z); 12 h before is 6h, inside the quiet hours.
      const windows = {
        back: windowOf('2026-11-27T21:00:00.000Z', '2026-12-01T21:00:00.000Z'),
        biceps: windowOf('2026-11-27T21:00:00.000Z', '2026-12-01T21:00:00.000Z'),
      }

      const [notice] = noticesOf(inputAt('2026-11-25T13:00:00.000Z', { windows }))

      expect(new Date(notice?.dueAtMs ?? 0).toISOString()).toBe('2026-11-27T00:00:00.000Z')
    })
  })
})

describe('Given the server comes back after the event of a notice', () => {
  describe('When the notices are due', () => {
    it('Then should give only the one whose event is still ahead', () => {
      const levels = {
        quadriceps: { level: 7, cooling: true, nextDropAtMs: at('2026-11-27T17:00:00.000Z') },
      }
      const windows = {
        quadriceps: windowOf('2026-11-16T12:00:00.000Z', '2026-11-20T12:00:00.000Z'),
      }

      expect([
        dueNoticesOf(inputAt('2026-11-27T16:00:00.000Z', { windows, levels })).length,
        dueNoticesOf(inputAt('2026-11-27T17:00:00.000Z', { windows, levels })).length,
      ]).toEqual([1, 0])
    })
  })
})

describe('Given a closing that is 30 h after the first of the letter', () => {
  describe('When the closing notice is listed', () => {
    it('Then should leave out the group that closes past the 24 h span', () => {
      const windows = {
        back: windowOf('2026-11-21T23:00:00.000Z', '2026-11-25T23:00:00.000Z'),
        biceps: windowOf('2026-11-23T05:00:00.000Z', '2026-11-27T05:00:00.000Z'),
      }

      const [notice] = noticesOf(inputAt('2026-11-25T11:00:00.000Z', { windows }))

      expect([
        notice?.groups.map(({ slug }) => slug),
        (notice?.eventAtMs ?? 0) - (notice?.dueAtMs ?? 0),
      ]).toEqual([['back'], 12 * HOUR_MS])
    })
  })
})
