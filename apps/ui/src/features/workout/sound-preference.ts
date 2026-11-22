import { useState } from 'react'

const SOUND_KEY = 'heavy-duty:sound'

// A device preference, not domain data: it stays in localStorage, outside the queue. A storage
// that is blocked or full leaves the sound on and the screen working.
export function readSoundOn(): boolean {
  try {
    return localStorage.getItem(SOUND_KEY) !== 'off'
  } catch {
    return true
  }
}

export function writeSoundOn(soundOn: boolean): void {
  try {
    localStorage.setItem(SOUND_KEY, soundOn ? 'on' : 'off')
  } catch {
    // The choice then lasts only until the screen closes.
  }
}

export function useSoundPreference(): [boolean, (soundOn: boolean) => void] {
  const [soundOn, setSoundOn] = useState(readSoundOn)
  return [
    soundOn,
    (next) => {
      writeSoundOn(next)
      setSoundOn(next)
    },
  ]
}
