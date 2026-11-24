import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GAME_SOUND_KEY, readSoundOn, useSoundPreference, writeSoundOn } from './sound-preference'

afterEach(() => {
  localStorage.clear()
})

describe('Given a device with no sound preference saved', () => {
  describe('When the preference is read', () => {
    it('Then the sound should be on', () => {
      expect(readSoundOn()).toBe(true)
    })
  })
})

describe('Given the sound turned off with writeSoundOn', () => {
  describe('When the preference is read, even by a new hook', () => {
    it('Then the sound should be off', () => {
      writeSoundOn(false)

      const { result } = renderHook(() => useSoundPreference())

      expect({ read: readSoundOn(), hook: result.current[0] }).toEqual({
        read: false,
        hook: false,
      })
    })
  })
})

describe('Given the hook of the preference', () => {
  describe('When the athlete turns the sound off and on again', () => {
    it('Then the hook and the device should follow', () => {
      const { result } = renderHook(() => useSoundPreference())

      act(() => result.current[1](false))
      const afterOff = { hook: result.current[0], saved: readSoundOn() }
      act(() => result.current[1](true))

      expect({ afterOff, afterOn: { hook: result.current[0], saved: readSoundOn() } }).toEqual({
        afterOff: { hook: false, saved: false },
        afterOn: { hook: true, saved: true },
      })
    })
  })
})

describe('Given a localStorage that throws', () => {
  function blockStorage() {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
  }

  describe('When the preference is read', () => {
    it('Then the sound should be on', () => {
      blockStorage()

      expect(readSoundOn()).toBe(true)
    })
  })

  describe('When the preference is written', () => {
    it('Then should not throw', () => {
      blockStorage()

      expect(() => writeSoundOn(false)).not.toThrow()
    })
  })
})

describe('Given the game sound turned off (D60)', () => {
  describe('When both preferences are read', () => {
    it('Then only the game sound should be off, under its own key', () => {
      const { result } = renderHook(() => useSoundPreference(GAME_SOUND_KEY))

      act(() => result.current[1](false))

      expect({
        game: readSoundOn(GAME_SOUND_KEY),
        timer: readSoundOn(),
        saved: localStorage.getItem('heavy-duty:game-sound'),
      }).toEqual({ game: false, timer: true, saved: 'off' })
    })
  })
})
