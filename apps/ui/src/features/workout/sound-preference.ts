import { useState } from 'react'

// The sound of the timer and the sound of the game have a switch each (D60).
export const SOUND_KEY = 'heavy-duty:sound'
export const GAME_SOUND_KEY = 'heavy-duty:game-sound'

type SoundKey = typeof SOUND_KEY | typeof GAME_SOUND_KEY

// A device preference, not domain data: it stays in localStorage, outside the queue. A storage
// that is blocked or full leaves the sound on and the screen working.
export function readSoundOn(key: SoundKey = SOUND_KEY): boolean {
  try {
    return localStorage.getItem(key) !== 'off'
  } catch {
    return true
  }
}

export function writeSoundOn(soundOn: boolean, key: SoundKey = SOUND_KEY): void {
  try {
    localStorage.setItem(key, soundOn ? 'on' : 'off')
  } catch {
    // The choice then lasts only until the screen closes.
  }
}

export function useSoundPreference(
  key: SoundKey = SOUND_KEY,
): [boolean, (soundOn: boolean) => void] {
  const [soundOn, setSoundOn] = useState(() => readSoundOn(key))
  return [
    soundOn,
    (next) => {
      writeSoundOn(next, key)
      setSoundOn(next)
    },
  ]
}
