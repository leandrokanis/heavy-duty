import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchCurrentPeriod } from '@/features/period/period-client'
import { testPeriod } from '@/features/period/test-period'
import { createMemoryQueueStore } from '@/sync/queue-store'
import { SyncProvider } from '@/sync/sync-context'
import { createSyncQueue, type SyncQueue } from '@/sync/sync-queue'
import { pendingSetBody } from '@/sync/test-sets'
import { useWorkoutRankFromApi } from './use-workout-rank'
import type { SendOutcome } from './workout-set.types'

vi.mock('@/features/period/period-client', () => ({ fetchCurrentPeriod: vi.fn() }))
vi.mock('@/sync/period-cache', () => ({ storePeriod: vi.fn(async () => undefined) }))

const WORKOUT_ID = '0193a1b2-0000-7000-8000-000000000601'
const PERIOD = testPeriod({
  ranking: [
    {
      workoutId: 'w1',
      letter: 'B',
      startedAt: '2026-11-25T10:00:00.000Z',
      points: 90,
      position: 1,
    },
    {
      workoutId: WORKOUT_ID,
      letter: 'A',
      startedAt: '2026-12-02T18:30:00.000Z',
      points: 40,
      position: 2,
    },
  ],
})

function wrapperOf(queue: SyncQueue) {
  return ({ children }: { children: ReactNode }) => (
    <SyncProvider queue={queue}>{children}</SyncProvider>
  )
}

afterEach(() => {
  vi.mocked(fetchCurrentPeriod).mockReset()
})

describe('Given a finished workout whose set is still in the send queue', () => {
  describe('When the queue becomes empty', () => {
    it('Then should ask the API for the period once and return the rank of the workout in it', async () => {
      vi.mocked(fetchCurrentPeriod).mockResolvedValue({ status: 'ok', period: PERIOD })
      const send = vi
        .fn<() => Promise<SendOutcome>>()
        .mockResolvedValueOnce({ status: 'retry' })
        .mockResolvedValue({ status: 'confirmed' })
      const queue = createSyncQueue({ store: createMemoryQueueStore(), send })
      await queue.enqueue(WORKOUT_ID, pendingSetBody())
      await queue.flush()

      const { result } = renderHook(() => useWorkoutRankFromApi(true, WORKOUT_ID), {
        wrapper: wrapperOf(queue),
      })
      const before = result.current
      await act(async () => queue.flush())

      expect({
        before,
        rank: result.current,
        calls: vi.mocked(fetchCurrentPeriod).mock.calls.length,
      }).toEqual({ before: null, rank: { points: 40, position: 2 }, calls: 1 })
    })
  })
})

describe('Given the rank of the API and a correction that enters the queue', () => {
  describe('When the correction is still in the queue', () => {
    it('Then should return no rank, so the screen shows the provisional one', async () => {
      vi.mocked(fetchCurrentPeriod).mockResolvedValue({ status: 'ok', period: PERIOD })
      const send = vi.fn<() => Promise<SendOutcome>>().mockResolvedValue({ status: 'retry' })
      const queue = createSyncQueue({ store: createMemoryQueueStore(), send })
      const { result } = renderHook(() => useWorkoutRankFromApi(true, WORKOUT_ID), {
        wrapper: wrapperOf(queue),
      })
      await act(async () => queue.flush())
      const answered = result.current

      await act(async () => queue.enqueue(WORKOUT_ID, pendingSetBody()))

      expect({ answered, rank: result.current }).toEqual({
        answered: { points: 40, position: 2 },
        rank: null,
      })
    })
  })
})

describe('Given an empty queue and an API that cannot be reached', () => {
  describe('When the workout is ready', () => {
    it('Then should return no rank', async () => {
      vi.mocked(fetchCurrentPeriod).mockResolvedValue({ status: 'offline' })
      const queue = createSyncQueue({
        store: createMemoryQueueStore(),
        send: async () => ({ status: 'confirmed' }),
      })

      const { result } = renderHook(() => useWorkoutRankFromApi(true, WORKOUT_ID), {
        wrapper: wrapperOf(queue),
      })
      await act(async () => queue.flush())

      expect(result.current).toBeNull()
    })
  })
})
