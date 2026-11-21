import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SendOutcome } from '@/features/workout/workout-set.types'
import { createMemoryQueueStore } from './queue-store'
import { SYNC_RETRY_INTERVAL_MS } from './sync.config'
import { SyncProvider, useSyncSnapshot } from './sync-context'
import { createSyncQueue, type SyncQueue } from './sync-queue'
import { pendingSetBody } from './test-sets'

const WORKOUT_ID = '0193a1b2-0000-7000-8000-000000000601'

function PendingCount() {
  const { pending } = useSyncSnapshot()
  return <p role="status">{`${pending.length} pending`}</p>
}

async function queueWith(send: () => Promise<SendOutcome>): Promise<SyncQueue> {
  const queue = createSyncQueue({ store: createMemoryQueueStore(), send })
  await queue.enqueue(WORKOUT_ID, pendingSetBody())
  await queue.flush()
  return queue
}

afterEach(() => {
  vi.useRealTimers()
})

describe('Given a pending set and a send that answers retry and then confirmed', () => {
  describe('When the retry interval elapses', () => {
    it('Then the set should be sent again and the pending count should be zero', async () => {
      vi.useFakeTimers()
      const send = vi
        .fn<() => Promise<SendOutcome>>()
        .mockResolvedValueOnce({ status: 'retry' }) // the enqueue
        .mockResolvedValueOnce({ status: 'retry' }) // the flush on mount
        .mockResolvedValue({ status: 'confirmed' })
      const queue = await queueWith(send)

      render(
        <SyncProvider queue={queue}>
          <PendingCount />
        </SyncProvider>,
      )
      await act(async () => {
        await vi.advanceTimersByTimeAsync(SYNC_RETRY_INTERVAL_MS)
      })

      expect({
        calls: send.mock.calls.length,
        text: screen.getByRole('status').textContent,
      }).toEqual({ calls: 3, text: '0 pending' })
    })
  })
})

describe('Given a pending set whose first sends answered retry', () => {
  describe('When the online event fires while navigator.onLine is false', () => {
    it('Then the set should be sent and leave the queue only by the answer of the API', async () => {
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
      const send = vi
        .fn<() => Promise<SendOutcome>>()
        .mockResolvedValueOnce({ status: 'retry' })
        .mockResolvedValueOnce({ status: 'retry' })
        .mockResolvedValue({ status: 'confirmed' })
      const queue = await queueWith(send)
      render(
        <SyncProvider queue={queue}>
          <PendingCount />
        </SyncProvider>,
      )
      await act(async () => {
        await queue.flush()
      })
      const pendingBefore = screen.getByRole('status').textContent

      await act(async () => {
        window.dispatchEvent(new Event('online'))
      })

      await vi.waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('0 pending'))
      expect(pendingBefore).toBe('1 pending')
    })
  })

  describe('When the page becomes visible again', () => {
    it('Then the set should be sent', async () => {
      const send = vi
        .fn<() => Promise<SendOutcome>>()
        .mockResolvedValueOnce({ status: 'retry' })
        .mockResolvedValueOnce({ status: 'retry' })
        .mockResolvedValue({ status: 'confirmed' })
      const queue = await queueWith(send)
      render(
        <SyncProvider queue={queue}>
          <PendingCount />
        </SyncProvider>,
      )
      await act(async () => {
        await queue.flush()
      })

      await act(async () => {
        document.dispatchEvent(new Event('visibilitychange'))
      })

      await vi.waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('0 pending'))
    })
  })
})

describe('Given an empty queue', () => {
  describe('When the retry interval elapses', () => {
    it('Then nothing should be sent beyond the flush on mount', async () => {
      vi.useFakeTimers()
      const send = vi.fn<() => Promise<SendOutcome>>().mockResolvedValue({ status: 'confirmed' })
      const queue = createSyncQueue({ store: createMemoryQueueStore(), send })

      render(
        <SyncProvider queue={queue}>
          <PendingCount />
        </SyncProvider>,
      )
      await act(async () => {
        await vi.advanceTimersByTimeAsync(SYNC_RETRY_INTERVAL_MS * 3)
      })

      expect(send).not.toHaveBeenCalled()
    })
  })
})

describe('Given the provider mounts', () => {
  describe('When the browser offers persistent storage', () => {
    it('Then persist should be requested once even if the provider renders again', async () => {
      const persist = vi.fn(async () => true)
      vi.stubGlobal('navigator', { ...navigator, storage: { persist } })
      const queue = createSyncQueue({
        store: createMemoryQueueStore(),
        send: async () => ({ status: 'confirmed' }),
      })

      const { rerender } = render(
        <SyncProvider queue={queue}>
          <PendingCount />
        </SyncProvider>,
      )
      rerender(
        <SyncProvider queue={queue}>
          <PendingCount />
        </SyncProvider>,
      )

      expect(persist).toHaveBeenCalledTimes(1)
    })
  })

  describe('When the browser has no storage manager', () => {
    it('Then the children should still render', () => {
      vi.stubGlobal('navigator', {})
      const queue = createSyncQueue({
        store: createMemoryQueueStore(),
        send: async () => ({ status: 'confirmed' }),
      })

      render(
        <SyncProvider queue={queue}>
          <PendingCount />
        </SyncProvider>,
      )

      expect(screen.getByRole('status')).toHaveTextContent('0 pending')
    })
  })
})
