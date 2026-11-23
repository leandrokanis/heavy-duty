import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMemoryQueueStore } from '@/sync/queue-store'
import { SyncProvider } from '@/sync/sync-context'
import { createSyncQueue, type SyncQueue } from '@/sync/sync-queue'
import { pendingSetBody } from '@/sync/test-sets'
import { useReopenWindows } from './use-reopen-windows'
import type { ActivityWindows } from './windows.types'
import { fetchWindows } from './windows-client'
import type { SendOutcome } from './workout-set.types'

vi.mock('./windows-client', () => ({ fetchWindows: vi.fn() }))

const WORKOUT_ID = '0193a1b2-0000-7000-8000-000000000601'
const WINDOWS: ActivityWindows = { now: '2026-11-21T19:00:00.000Z', groups: [] }

function wrapperOf(queue: SyncQueue) {
  return ({ children }: { children: ReactNode }) => (
    <SyncProvider queue={queue}>{children}</SyncProvider>
  )
}

afterEach(() => {
  vi.mocked(fetchWindows).mockReset()
})

describe('Given an empty send queue and an API that cannot be reached', () => {
  describe('When the workout is ready', () => {
    it('Then should return no windows', async () => {
      vi.mocked(fetchWindows).mockResolvedValue({ status: 'offline' })
      const queue = createSyncQueue({
        store: createMemoryQueueStore(),
        send: async () => ({ status: 'confirmed' }),
      })

      const { result } = renderHook(() => useReopenWindows(true), { wrapper: wrapperOf(queue) })
      await act(async () => queue.flush())

      expect({ windows: result.current, calls: vi.mocked(fetchWindows).mock.calls.length }).toEqual(
        { windows: null, calls: 1 },
      )
    })
  })
})

describe('Given a finished workout whose set is still in the send queue', () => {
  describe('When the queue becomes empty', () => {
    it('Then should ask the API for the windows once and return them only after that', async () => {
      vi.mocked(fetchWindows).mockResolvedValue({ status: 'ok', windows: WINDOWS })
      const send = vi
        .fn<() => Promise<SendOutcome>>()
        .mockResolvedValueOnce({ status: 'retry' })
        .mockResolvedValue({ status: 'confirmed' })
      const queue = createSyncQueue({ store: createMemoryQueueStore(), send })
      await queue.enqueue(WORKOUT_ID, pendingSetBody())
      await queue.flush()

      const { result } = renderHook(() => useReopenWindows(true), { wrapper: wrapperOf(queue) })
      const before = { windows: result.current, calls: vi.mocked(fetchWindows).mock.calls.length }
      await act(async () => queue.flush())

      expect({
        before,
        windows: result.current,
        calls: vi.mocked(fetchWindows).mock.calls.length,
      }).toEqual({ before: { windows: null, calls: 0 }, windows: WINDOWS, calls: 1 })
    })
  })
})
