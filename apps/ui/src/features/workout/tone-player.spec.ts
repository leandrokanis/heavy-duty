import { describe, expect, it, vi } from 'vitest'
import { createTonePlayer } from './tone-player'

type FakeOscillator = {
  type: string
  frequency: { value: number }
  connect: () => void
  start: (atSeconds?: number) => void
  stop: (atSeconds?: number) => void
}

// An AudioContext that records the oscillators the player starts.
function fakeContext(state: 'running' | 'suspended' = 'running') {
  const oscillators: FakeOscillator[] = []
  const resume = vi.fn(() => Promise.resolve())
  const context = {
    state,
    currentTime: 0,
    destination: {},
    resume,
    createOscillator: () => {
      const oscillator: FakeOscillator = {
        type: 'sine',
        frequency: { value: 0 },
        connect: () => {},
        start: () => {},
        stop: () => {},
      }
      oscillators.push(oscillator)
      return oscillator
    },
    createGain: () => ({ gain: { value: 1 }, connect: () => {} }),
  }
  return { context, oscillators, resume }
}

function frequenciesOf(cue: 'count' | 'start' | 'warning' | 'end'): number[] {
  const { context, oscillators } = fakeContext()
  const player = createTonePlayer(() => context as unknown as AudioContext)
  player.unlock()
  player.play(cue)
  return oscillators.map(({ frequency }) => frequency.value)
}

describe('Given a tone player over a fake audio context', () => {
  describe.each([
    { cue: 'count', frequencies: [660] },
    { cue: 'start', frequencies: [1320, 1760] },
    { cue: 'warning', frequencies: [880] },
    { cue: 'end', frequencies: [1047, 784, 523] },
  ] as const)('When play is called with $cue', ({ cue, frequencies }) => {
    it(`Then should start oscillators at ${frequencies.join(', ')} Hz`, () => {
      expect(frequenciesOf(cue)).toEqual(frequencies)
    })
  })

  describe('When play is called with the four cues', () => {
    it('Then the cues should differ from one another', () => {
      const keys = (['count', 'start', 'warning', 'end'] as const).map((cue) =>
        frequenciesOf(cue).join(),
      )

      expect(new Set(keys).size).toBe(4)
    })
  })

  describe('When play is called before unlock', () => {
    it('Then should not throw', () => {
      const { context } = fakeContext()
      const player = createTonePlayer(() => context as unknown as AudioContext)

      expect(() => player.play('count')).not.toThrow()
    })
  })

  describe('When unlock is called on a suspended context', () => {
    it('Then should resume it', () => {
      const { context, resume } = fakeContext('suspended')

      createTonePlayer(() => context as unknown as AudioContext).unlock()

      expect(resume).toHaveBeenCalledTimes(1)
    })
  })
})

describe('Given an audio context that is not there or fails', () => {
  describe.each([
    { name: 'no AudioContext in the window', create: () => null },
    {
      name: 'a constructor that throws',
      create: () => {
        throw new Error('no audio')
      },
    },
    {
      name: 'a resume that rejects',
      create: () => ({
        ...fakeContext('suspended').context,
        resume: () => Promise.reject(new Error('blocked')),
      }),
    },
  ])('When unlock and play run with $name', ({ create }) => {
    it('Then nothing should throw', async () => {
      const player = createTonePlayer(create as unknown as () => AudioContext | null)

      expect(() => {
        player.unlock()
        player.play('end')
      }).not.toThrow()
      await Promise.resolve()
    })
  })
})
