import { describe, expect, it } from 'vitest'
import { loadBackupConfig } from './backup-env.js'

const INSECURE_DEV_PASSWORD = 'insecure-dev-only-password'

const VALID_ENV = {
  NODE_ENV: 'development',
  DATABASE_PATH: '/data/heavy-duty.sqlite',
  RESTIC_REPOSITORY: '/backup/restic',
  RESTIC_PASSWORD: INSECURE_DEV_PASSWORD,
}

describe('Given a backup environment without RESTIC_REPOSITORY', () => {
  const { RESTIC_REPOSITORY: _omitted, ...env } = VALID_ENV

  describe('When the backup configuration is loaded', () => {
    it('Then should fail naming RESTIC_REPOSITORY', () => {
      expect(() => loadBackupConfig(env)).toThrow(/RESTIC_REPOSITORY/)
    })
  })
})

describe('Given both RESTIC_PASSWORD and RESTIC_PASSWORD_FILE', () => {
  const env = { ...VALID_ENV, RESTIC_PASSWORD_FILE: '/run/secrets/restic-password' }

  describe('When the backup configuration is loaded', () => {
    it('Then should fail naming both variables', () => {
      expect(() => loadBackupConfig(env)).toThrow(
        /RESTIC_PASSWORD_FILE.*RESTIC_PASSWORD|RESTIC_PASSWORD.*RESTIC_PASSWORD_FILE/,
      )
    })
  })
})

describe('Given neither RESTIC_PASSWORD nor RESTIC_PASSWORD_FILE', () => {
  const { RESTIC_PASSWORD: _omitted, ...env } = VALID_ENV

  describe('When the backup configuration is loaded', () => {
    it('Then should fail naming RESTIC_PASSWORD_FILE', () => {
      expect(() => loadBackupConfig(env)).toThrow(/RESTIC_PASSWORD_FILE/)
    })
  })
})

describe('Given BACKUP_TIME_ZONE that is not an IANA time zone', () => {
  const env = { ...VALID_ENV, BACKUP_TIME_ZONE: 'Mars/Olympus_Mons' }

  describe('When the backup configuration is loaded', () => {
    it('Then should fail naming BACKUP_TIME_ZONE', () => {
      expect(() => loadBackupConfig(env)).toThrow(/BACKUP_TIME_ZONE/)
    })
  })
})

describe('Given BACKUP_DAILY_AT outside the HH:mm format', () => {
  const env = { ...VALID_ENV, BACKUP_DAILY_AT: '25:00' }

  describe('When the backup configuration is loaded', () => {
    it('Then should fail naming BACKUP_DAILY_AT', () => {
      expect(() => loadBackupConfig(env)).toThrow(/BACKUP_DAILY_AT/)
    })
  })
})

describe('Given a backup environment without the optional variables', () => {
  describe('When the backup configuration is loaded', () => {
    it('Then should use the restic binary on PATH and a daily run at 03:00 in America/Sao_Paulo', () => {
      expect(loadBackupConfig(VALID_ENV)).toEqual({
        databasePath: '/data/heavy-duty.sqlite',
        resticRepository: '/backup/restic',
        resticPassword: { kind: 'value', value: INSECURE_DEV_PASSWORD },
        resticBinary: 'restic',
        timeZone: 'America/Sao_Paulo',
        dailyAt: '03:00',
      })
    })
  })
})

describe('Given RESTIC_PASSWORD together with RESTIC_PASSWORD_FILE and an invalid BACKUP_DAILY_AT', () => {
  const env = {
    ...VALID_ENV,
    RESTIC_PASSWORD_FILE: '/run/secrets/restic-password',
    BACKUP_DAILY_AT: INSECURE_DEV_PASSWORD,
  }

  describe('When the backup configuration is loaded', () => {
    it('Then the error message should not contain the password value', () => {
      expect(() => loadBackupConfig(env)).toThrow(
        expect.objectContaining({ message: expect.not.stringContaining(INSECURE_DEV_PASSWORD) }),
      )
    })
  })
})
