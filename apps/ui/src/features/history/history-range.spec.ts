import { describe, expect, it } from 'vitest'
import { HISTORY_PAGE_DAYS, historyRangeOf } from './history-range'

const DAY_MS = 86_400_000
const NOW_MS = Date.parse('2026-11-23T13:00:00.000Z')

describe('Given the history pages of 92 days', () => {
  describe('When the first page is asked', () => {
    it('Then should end one day after now and start 92 days before its end', () => {
      expect(historyRangeOf(0, NOW_MS)).toEqual({
        fromMs: NOW_MS + DAY_MS - HISTORY_PAGE_DAYS * DAY_MS,
        toMs: NOW_MS + DAY_MS,
      })
    })
  })

  describe('When the second page is asked', () => {
    it('Then should end where the first page starts', () => {
      expect(historyRangeOf(1, NOW_MS).toMs).toBe(historyRangeOf(0, NOW_MS).fromMs)
    })
  })

  describe('When any page is asked', () => {
    it('Then should span the 92 days the API accepts', () => {
      const { fromMs, toMs } = historyRangeOf(3, NOW_MS)

      expect(toMs - fromMs).toBe(92 * DAY_MS)
    })
  })
})
