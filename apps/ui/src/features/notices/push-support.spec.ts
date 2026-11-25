import { describe, expect, it } from 'vitest'
import { keyBytesOf, type PushEnvironment, pushSupportOf } from './push-support'

const INSTALLED_WITH_PUSH: PushEnvironment = {
  standalone: true,
  serviceWorker: true,
  pushManager: true,
  notification: true,
}

describe('Given the environment of the browser', () => {
  describe('When the app runs on the home screen with service worker, push and notifications', () => {
    it('Then should be supported', () => {
      expect(pushSupportOf(INSTALLED_WITH_PUSH)).toBe('supported')
    })
  })

  describe('When the app runs in the browser, outside the home screen', () => {
    it('Then should be not installed, even with push', () => {
      expect(pushSupportOf({ ...INSTALLED_WITH_PUSH, standalone: false })).toBe('not-installed')
    })
  })

  describe.each(['serviceWorker', 'pushManager', 'notification'] as const)(
    'When the installed app has no %s',
    (missing) => {
      it('Then should be unsupported', () => {
        expect(pushSupportOf({ ...INSTALLED_WITH_PUSH, [missing]: false })).toBe('unsupported')
      })
    },
  )
})

describe('Given a public key in base64url', () => {
  describe('When it becomes bytes for the subscription', () => {
    it('Then should decode the base64url alphabet without padding', () => {
      expect([...keyBytesOf('-_8A')]).toEqual([0xfb, 0xff, 0x00])
    })
  })
})
