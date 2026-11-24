import type { Cue } from './timer-cues'

type Tone = {
  frequencyHz: number
  type: OscillatorType
  startSeconds: number
  durationSeconds: number
  volume: number
}

// The tones of the prototype of the PO. The rest has a softer tone of its own, an estimate to
// confirm on the phone.
const TONES: Record<Cue, Tone[]> = {
  count: [{ frequencyHz: 660, type: 'sine', startSeconds: 0, durationSeconds: 0.12, volume: 0.3 }],
  start: [
    { frequencyHz: 1320, type: 'sine', startSeconds: 0, durationSeconds: 0.35, volume: 0.3 },
    { frequencyHz: 1760, type: 'sine', startSeconds: 0, durationSeconds: 0.35, volume: 0.2 },
  ],
  warning: [
    { frequencyHz: 880, type: 'square', startSeconds: 0, durationSeconds: 0.1, volume: 0.08 },
  ],
  end: [
    { frequencyHz: 1047, type: 'sine', startSeconds: 0, durationSeconds: 0.2, volume: 0.3 },
    { frequencyHz: 784, type: 'sine', startSeconds: 0.2, durationSeconds: 0.2, volume: 0.3 },
    { frequencyHz: 523, type: 'sine', startSeconds: 0.4, durationSeconds: 0.4, volume: 0.3 },
  ],
  restWarning: [
    { frequencyHz: 1175, type: 'sine', startSeconds: 0, durationSeconds: 0.15, volume: 0.25 },
  ],
}

export type TonePlayer = {
  // Called inside a tap: the browser lets the audio play only after a gesture.
  unlock: () => void
  play: (cue: Cue) => void
}

// The sound is a help, never a need: every failure of the audio stays here and the timer goes on.
export function createTonePlayer(createContext: () => AudioContext | null): TonePlayer {
  let context: AudioContext | null = null
  const contextOf = (): AudioContext | null => {
    try {
      context ??= createContext()
    } catch {
      context = null
    }
    return context
  }
  return {
    unlock() {
      const audio = contextOf()
      if (audio?.state === 'suspended') audio.resume().catch(() => {})
    },
    play(cue) {
      const audio = contextOf()
      if (audio === null) return
      try {
        for (const tone of TONES[cue]) playTone(audio, tone)
      } catch {
        // A failed tone is dropped: the screen does not depend on it.
      }
    },
  }
}

function playTone(audio: AudioContext, tone: Tone): void {
  const oscillator = audio.createOscillator()
  const gain = audio.createGain()
  oscillator.type = tone.type
  oscillator.frequency.value = tone.frequencyHz
  gain.gain.value = tone.volume
  oscillator.connect(gain)
  gain.connect(audio.destination)
  const startsAt = audio.currentTime + tone.startSeconds
  oscillator.start(startsAt)
  oscillator.stop(startsAt + tone.durationSeconds)
}

export const defaultTonePlayer: TonePlayer = createTonePlayer(() =>
  typeof window !== 'undefined' && 'AudioContext' in window ? new window.AudioContext() : null,
)
