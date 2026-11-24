import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { clearActiveWorkout } from '@/sync/active-workout-store'
import { createMemoryQueueStore } from '@/sync/queue-store'
import { SyncProvider } from '@/sync/sync-context'
import { createSyncQueue } from '@/sync/sync-queue'
import { PRANCHA, SUPINO_RETO, todayDay } from './test-today'
import type { TodayExercise } from './today.types'
import { createWorkoutFlow } from './workout-flow'
import { WorkoutScreen } from './workout-screen'

// Supino 3 x 10 at 42.5 kg on screen, with the record for 10 reps at 42.5 kg.
const SUPINO_WITH_RECORD: TodayExercise = {
  ...SUPINO_RETO,
  loadG: 42_500,
  records: [{ reps: 10, loadG: 42_500 }],
}

function renderWorkout(exercises: TodayExercise[]) {
  // The queue never answers, so the sets stay on the device during the test.
  const queue = createSyncQueue({
    store: createMemoryQueueStore(),
    send: () => new Promise(() => {}),
  })
  const flow = createWorkoutFlow({
    workoutId: '0193a1b2-0000-7000-8000-000000000601',
    startedAt: '2026-11-21T18:30:00.000Z',
    programId: 'program-1',
    day: todayDay('A', 'Superior', exercises),
  })
  render(
    <SyncProvider queue={queue}>
      <WorkoutScreen flow={flow} onFinish={vi.fn()} />
    </SyncProvider>,
  )
}

afterEach(async () => {
  cleanup()
  vi.useRealTimers()
  await clearActiveWorkout()
})

describe('Given supino with the record for 10 reps at 42.5 kg', () => {
  describe('When the athlete opens a set of supino with 10 reps', () => {
    it('Then the mark of 42,5 kg shows beside the load', () => {
      renderWorkout([SUPINO_WITH_RECORD, PRANCHA])

      expect(screen.getByText('Recorde: 42,5 kg')).toBeTruthy()
    })
  })

  describe('When the athlete raises the load to 45 kg', () => {
    it('Then the mark reads that the record is beaten', () => {
      renderWorkout([SUPINO_WITH_RECORD, PRANCHA])

      fireEvent.click(screen.getByRole('button', { name: 'Aumentar carga' }))

      expect(screen.getByText('Acima do recorde de 42,5 kg')).toBeTruthy()
    })
  })

  describe('When the athlete records 10 reps with 45 kg', () => {
    it('Then the button of the last set shows the set as a record', () => {
      vi.useFakeTimers({ now: Date.UTC(2026, 10, 21, 18, 31, 5), toFake: ['Date'] })
      renderWorkout([SUPINO_WITH_RECORD, PRANCHA])

      fireEvent.click(screen.getByRole('button', { name: 'Aumentar carga' }))
      fireEvent.click(screen.getByRole('button', { name: 'Próximo' }))

      expect(
        screen.getByRole('button', {
          name: 'Corrigir última série: 45 quilos, 10 repetições, recorde',
        }),
      ).toBeTruthy()
    })
  })
})

describe('Given supino with the record for 10 reps at 42.5 kg and one set of it to do', () => {
  describe('When the athlete records 10 reps with 45 kg and opens the sequence', () => {
    it('Then the set reads as a record in the list of sets', () => {
      vi.useFakeTimers({ now: Date.UTC(2026, 10, 21, 18, 31, 5), toFake: ['Date'] })
      renderWorkout([{ ...SUPINO_WITH_RECORD, sets: 1 }, PRANCHA])

      fireEvent.click(screen.getByRole('button', { name: 'Aumentar carga' }))
      fireEvent.click(screen.getByRole('button', { name: 'Próximo' }))
      fireEvent.click(screen.getByRole('button', { name: /^Sequência do treino/ }))
      const sets = screen.getByRole('list', { name: 'Séries de Supino reto' })

      expect(within(sets).getByRole('listitem').textContent).toContain(
        'Série 1: 45 kg, 10 repetições, recorde',
      )
    })
  })
})

describe('Given supino with no past set', () => {
  describe('When the athlete opens the first set', () => {
    it('Then no record mark shows', () => {
      renderWorkout([{ ...SUPINO_RETO, records: [] }, PRANCHA])

      expect(screen.queryByText(/recorde/i)).toBeNull()
    })
  })
})
