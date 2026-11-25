import { describe, expect, it } from 'vitest'
import { loadMailConfig, type MailConfig, smtpTransportOptionsOf } from './mail-env.js'

const MAIL_ENV = {
  SMTP_HOST: 'smtp',
  MAIL_FROM: 'avisos@example.com',
  MAIL_TO: 'atleta@example.com',
}

const RELAY_ENV = {
  ...MAIL_ENV,
  SMTP_PORT: '587',
  SMTP_USER: 'relay-user',
  SMTP_PASSWORD_FILE: '/run/secrets/smtp-password',
}

const readPassword = (path: string) => `password-from:${path}\n`

describe('Given an environment without the email variables', () => {
  describe('When the mail configuration is loaded', () => {
    it('Then should turn the email channel off without a warning', () => {
      expect(loadMailConfig({ NODE_ENV: 'production' })).toEqual({ mail: null, warnings: [] })
    })
  })
})

describe('Given SMTP_HOST without MAIL_FROM and MAIL_TO', () => {
  describe('When the mail configuration is loaded', () => {
    it('Then should turn the email channel off, see ADR-037', () => {
      expect(loadMailConfig({ SMTP_HOST: 'smtp' }).mail).toBeNull()
    })
  })
})

describe('Given SMTP_HOST, MAIL_FROM and MAIL_TO', () => {
  describe('When the mail configuration is loaded', () => {
    it('Then should use port 25 without authentication', () => {
      expect(loadMailConfig(MAIL_ENV)).toEqual({
        mail: {
          smtpHost: 'smtp',
          smtpPort: 25,
          smtpAuth: null,
          mailFrom: 'avisos@example.com',
          mailTo: 'atleta@example.com',
        },
        warnings: [],
      })
    })
  })

  describe('and SMTP_USER with SMTP_PASSWORD_FILE on port 587', () => {
    describe('When the mail configuration is loaded', () => {
      it('Then should keep the user and the password read from the file, without the newline', () => {
        expect(loadMailConfig(RELAY_ENV, readPassword).mail).toMatchObject({
          smtpPort: 587,
          smtpAuth: { user: 'relay-user', password: 'password-from:/run/secrets/smtp-password' },
        })
      })
    })
  })
})

describe('Given SMTP_PASSWORD_FILE that cannot be read', () => {
  describe('When the mail configuration is loaded', () => {
    it('Then should turn the email channel off with a warning that names the variable', () => {
      const unreadable = () => {
        throw new Error('ENOENT: /run/secrets/smtp-password')
      }

      expect(loadMailConfig(RELAY_ENV, unreadable)).toEqual({
        mail: null,
        warnings: ['email notices off: could not read the file in SMTP_PASSWORD_FILE'],
      })
    })
  })
})

describe('Given SMTP_USER without SMTP_PASSWORD_FILE', () => {
  describe('When the mail configuration is loaded', () => {
    it('Then should turn the email channel off with a warning naming SMTP_PASSWORD_FILE', () => {
      const loaded = loadMailConfig({ ...MAIL_ENV, SMTP_USER: 'relay-user' })

      expect([loaded.mail, loaded.warnings.join()]).toEqual([
        null,
        expect.stringMatching(/SMTP_PASSWORD_FILE/),
      ])
    })
  })
})

describe('Given SMTP_PASSWORD_FILE without SMTP_USER, as the stack mounts it for the local server', () => {
  describe('When the mail configuration is loaded', () => {
    it('Then should connect without authentication and without reading the file', () => {
      const unreadable = () => {
        throw new Error('should not read the file')
      }

      expect(
        loadMailConfig(
          { ...MAIL_ENV, SMTP_PASSWORD_FILE: '/run/secrets/smtp-password' },
          unreadable,
        ),
      ).toMatchObject({ mail: { smtpAuth: null }, warnings: [] })
    })
  })
})

describe('Given SMTP_USER with an empty password file', () => {
  describe('When the mail configuration is loaded', () => {
    it('Then should turn the email channel off with a warning', () => {
      expect(loadMailConfig(RELAY_ENV, () => '\n')).toEqual({
        mail: null,
        warnings: ['email notices off: the file in SMTP_PASSWORD_FILE is empty'],
      })
    })
  })
})

describe('Given MAIL_TO that is not an email address', () => {
  describe('When the mail configuration is loaded', () => {
    it('Then should warn naming MAIL_TO without its value', () => {
      const loaded = loadMailConfig({ ...MAIL_ENV, MAIL_TO: 'not-an-address' })

      expect([loaded.mail, /MAIL_TO/.test(loaded.warnings.join())]).toEqual([null, true])
      expect(loaded.warnings.join()).not.toMatch(/not-an-address/)
    })
  })
})

describe('Given SMTP_PORT outside the TCP range', () => {
  describe('When the mail configuration is loaded', () => {
    it('Then should warn naming SMTP_PORT', () => {
      expect(loadMailConfig({ ...MAIL_ENV, SMTP_PORT: '70000' }).warnings.join()).toMatch(
        /SMTP_PORT/,
      )
    })
  })
})

describe('Given a mail configuration on port 25 without authentication', () => {
  describe('When the transport options are built', () => {
    it('Then should connect without implicit TLS and without auth', () => {
      const config: MailConfig = {
        smtpHost: 'smtp',
        smtpPort: 25,
        smtpAuth: null,
        mailFrom: 'avisos@example.com',
        mailTo: 'atleta@example.com',
      }

      expect(smtpTransportOptionsOf(config)).toEqual({
        host: 'smtp',
        port: 25,
        secure: false,
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 30_000,
      })
    })
  })
})

describe('Given a mail configuration on port 465 with authentication', () => {
  describe('When the transport options are built', () => {
    it('Then should use implicit TLS and the password', () => {
      const config = loadMailConfig({ ...RELAY_ENV, SMTP_PORT: '465' }, readPassword).mail
      if (config === null) throw new Error('expected a mail configuration')

      expect(smtpTransportOptionsOf(config)).toMatchObject({
        port: 465,
        secure: true,
        auth: { user: 'relay-user', pass: 'password-from:/run/secrets/smtp-password' },
      })
    })
  })
})
