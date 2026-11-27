import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SendOutcome } from '@/features/workout/workout-set.types'
import { loadMedals } from '@/sync/medals-cache'
import { createMemoryQueueStore } from '@/sync/queue-store'
import { SyncProvider } from '@/sync/sync-context'
import { createSyncQueue, type SyncQueue } from '@/sync/sync-queue'
import { pendingSetBody } from '@/sync/test-sets'
import { medal } from './test-medals'
import { useMedalsAfterSync } from './use-medals-after-sync'

vi.mock('@/sync/medals-cache', () => ({ loadMedals: vi.fn() }))

const WORKOUT_ID = '0193a1b2-0000-7000-8000-000000000601'
const RECORD = medal({ awardedAt: '2026-12-02T18:31:00.000Z', workoutId: WORKOUT_ID })

function wrapperOf(queue: SyncQueue) {
  return ({ children }: { children: ReactNode }) => (
    <SyncProvider queue={queue}>{children}</SyncProvider>
  )
}

afterEach(() => {
  vi.mocked(loadMedals).mockReset()
})

describe('Given a set of the first record still in the send queue', () => {
  describe('When the queue becomes empty and the API awarded the medal', () => {
    it('Then should read the medals once and return the first record as awarded now', async () => {
      vi.mocked(loadMedals).mockResolvedValue({
        status: 'ok',
        medals: { now: RECORD.awardedAt as string, medals: [RECORD] },
        awardedNow: [RECORD],
      })
      const send = vi
        .fn<() => Promise<SendOutcome>>()
        .mockResolvedValueOnce({ status: 'retry' })
        .mockResolvedValue({ status: 'confirmed' })
      const queue = createSyncQueue({ store: createMemoryQueueStore(), send })
      await queue.enqueue(WORKOUT_ID, pendingSetBody())
      await queue.flush()

      const { result } = renderHook(() => useMedalsAfterSync(), { wrapper: wrapperOf(queue) })
      const before = result.current.awardedNow
      await act(async () => queue.flush())

      expect({
        before,
        awardedNow: result.current.awardedNow.map(({ code }) => code),
        reads: vi.mocked(loadMedals).mock.calls.length,
      }).toEqual({ before: [], awardedNow: ['first_record'], reads: 1 })
    })
  })

  describe('When the toast is dismissed', () => {
    it('Then should return no medal awarded now', async () => {
      vi.mocked(loadMedals).mockResolvedValue({
        status: 'ok',
        medals: { now: RECORD.awardedAt as string, medals: [RECORD] },
        awardedNow: [RECORD],
      })
      const queue = createSyncQueue({
        store: createMemoryQueueStore(),
        send: async () => ({ status: 'confirmed' }),
      })

      const { result } = renderHook(() => useMedalsAfterSync(), { wrapper: wrapperOf(queue) })
      await act(async () => {})
      act(() => result.current.dismiss())

      expect(result.current.awardedNow).toEqual([])
    })
  })
})
