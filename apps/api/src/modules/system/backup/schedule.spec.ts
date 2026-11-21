import { describe, expect, it } from 'vitest'
import { type BackupSchedule, isBackupDue } from './schedule.js'

const SCHEDULE: BackupSchedule = { timeZone: 'America/Sao_Paulo', dailyAt: '03:00' }

const at = (iso: string) => new Date(iso)

describe('Given a schedule at 03:00 in America/Sao_Paulo', () => {
  describe('When it is 05:59Z (02:59 local) and no backup ever ran', () => {
    it('Then the backup should not be due', () => {
      expect(isBackupDue(at('2026-11-21T05:59:00.000Z'), undefined, SCHEDULE)).toBe(false)
    })
  })

  describe('When it is 12:00Z and a backup started at 06:30Z on the same day', () => {
    it('Then the backup should not be due', () => {
      expect(
        isBackupDue(at('2026-11-21T12:00:00.000Z'), at('2026-11-21T06:30:00.000Z'), SCHEDULE),
      ).toBe(false)
    })
  })

  describe('When it is 06:00Z (03:00 local) and the last backup started on the previous day', () => {
    it('Then the backup should be due', () => {
      expect(
        isBackupDue(at('2026-11-21T06:00:00.000Z'), at('2026-11-20T06:00:00.000Z'), SCHEDULE),
      ).toBe(true)
    })
  })

  describe('When it is 12:00Z and a backup started at 05:00Z on the same day, before 03:00 local', () => {
    it('Then the backup should be due', () => {
      expect(
        isBackupDue(at('2026-11-21T12:00:00.000Z'), at('2026-11-21T05:00:00.000Z'), SCHEDULE),
      ).toBe(true)
    })
  })

  describe('When it is past 03:00 local and no backup ever ran', () => {
    it('Then the backup should be due', () => {
      expect(isBackupDue(at('2026-11-21T12:00:00.000Z'), undefined, SCHEDULE)).toBe(true)
    })
  })

  describe('When it is 02:00Z on 2026-11-22 (23:00 local on 2026-11-21) and a backup started at 06:30Z on 2026-11-21', () => {
    it('Then the backup should not be due, because both fall on the same local day', () => {
      expect(
        isBackupDue(at('2026-11-22T02:00:00.000Z'), at('2026-11-21T06:30:00.000Z'), SCHEDULE),
      ).toBe(false)
    })
  })
})
