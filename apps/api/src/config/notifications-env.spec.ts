import { describe, expect, it } from 'vitest'
import { loadNotificationsConfig } from './notifications-env.js'

const APP_ORIGIN = 'https://heavy-duty.example.test'
const KEY_FILE = '/run/secrets/vapid-private-key'
// Placeholders: the loader only passes the values along, it never checks the key format.
const PUBLIC_KEY = 'test-public-key'
const PRIVATE_KEY = 'test-private-key'

function readerOf(files: Record<string, string>) {
  return (path: string) => {
    const content = files[path]
    if (content === undefined) throw new Error(`ENOENT: ${path}`)
    return content
  }
}

function load(env: Record<string, string | undefined>, files: Record<string, string> = {}) {
  return loadNotificationsConfig(env, { appOrigin: APP_ORIGIN, readFile: readerOf(files) })
}

describe('Given no VAPID variable', () => {
  describe('When the notifications configuration is loaded', () => {
    it('Then should leave the push channel off without warnings', () => {
      expect(load({})).toEqual({ push: null, warnings: [] })
    })
  })
})

describe('Given the public key and the file of the private key', () => {
  describe('When the notifications configuration is loaded', () => {
    it('Then should turn the push channel on with the app origin as subject', () => {
      const env = { VAPID_PUBLIC_KEY: PUBLIC_KEY, VAPID_PRIVATE_KEY_FILE: KEY_FILE }

      expect(load(env, { [KEY_FILE]: `${PRIVATE_KEY}\n` })).toEqual({
        push: { publicKey: PUBLIC_KEY, privateKey: PRIVATE_KEY, subject: APP_ORIGIN },
        warnings: [],
      })
    })

    describe('and VAPID_SUBJECT is set', () => {
      it('Then should use VAPID_SUBJECT as subject', () => {
        const env = {
          VAPID_PUBLIC_KEY: PUBLIC_KEY,
          VAPID_PRIVATE_KEY_FILE: KEY_FILE,
          VAPID_SUBJECT: 'https://other.example.test',
        }

        expect(load(env, { [KEY_FILE]: PRIVATE_KEY }).push?.subject).toBe(
          'https://other.example.test',
        )
      })
    })
  })
})

describe('Given empty VAPID variables, as the production stack leaves them', () => {
  describe('When the notifications configuration is loaded', () => {
    it('Then should leave the push channel off without warnings', () => {
      expect(load({ VAPID_PUBLIC_KEY: '', VAPID_PRIVATE_KEY_FILE: '' })).toEqual({
        push: null,
        warnings: [],
      })
    })
  })
})

describe('Given the file of the private key is empty and the public key is missing', () => {
  describe('When the notifications configuration is loaded', () => {
    it('Then should leave the push channel off without warnings', () => {
      expect(load({ VAPID_PRIVATE_KEY_FILE: KEY_FILE }, { [KEY_FILE]: '' })).toEqual({
        push: null,
        warnings: [],
      })
    })
  })
})

describe('Given only the public key', () => {
  describe('When the notifications configuration is loaded', () => {
    it('Then should leave the push channel off and name the missing variable', () => {
      expect(load({ VAPID_PUBLIC_KEY: PUBLIC_KEY })).toEqual({
        push: null,
        warnings: ['push notices off: set VAPID_PRIVATE_KEY_FILE'],
      })
    })
  })
})

describe('Given a private key file that cannot be read', () => {
  describe('When the notifications configuration is loaded', () => {
    it('Then should leave the push channel off and warn without the content', () => {
      const env = { VAPID_PUBLIC_KEY: PUBLIC_KEY, VAPID_PRIVATE_KEY_FILE: KEY_FILE }

      expect(load(env)).toEqual({
        push: null,
        warnings: ['push notices off: could not read the file in VAPID_PRIVATE_KEY_FILE'],
      })
    })
  })
})

describe('Given a private key file and no public key', () => {
  describe('When the notifications configuration is loaded', () => {
    it('Then should leave the push channel off and name VAPID_PUBLIC_KEY', () => {
      const result = load({ VAPID_PRIVATE_KEY_FILE: KEY_FILE }, { [KEY_FILE]: PRIVATE_KEY })

      expect(result).toEqual({ push: null, warnings: ['push notices off: set VAPID_PUBLIC_KEY'] })
    })
  })
})
