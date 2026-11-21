import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PendingSetsIndicator } from '@/features/workout/pending-sets-indicator'
import type { SendOutcome } from '@/features/workout/workout-set.types'
import { createMemoryQueueStore } from './queue-store'
import { SYNC_RETRY_INTERVAL_MS } from './sync.config'
import { SyncProvider, sendPendingItem, useSyncSnapshot } from './sync-context'
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

describe('Given a pending set and the pending finish of a workout', () => {
  describe('When the app queue sends each of them', () => {
    it('Then should POST the set to the sets of the workout and the finish to the finish of the workout, with their own bodies', async () => {
      const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }))
      vi.stubGlobal('fetch', fetchMock)
      const set = pendingSetBody()
      const finish = { finishedAt: '2026-11-21T19:20:00.000Z', endReason: 'ended_early' as const }

      await sendPendingItem({
        kind: 'set',
        seq: 1,
        id: set.id,
        workoutId: WORKOUT_ID,
        body: set,
        queuedAt: 1,
      })
      await sendPendingItem({
        kind: 'finish',
        seq: 2,
        id: `${WORKOUT_ID}:finish`,
        workoutId: WORKOUT_ID,
        body: finish,
        queuedAt: 2,
      })

      expect(
        (fetchMock.mock.calls as unknown as [string, RequestInit][]).map(([url, init]) => [
          url,
          init.method,
          init.body,
        ]),
      ).toEqual([
        [`/api/workouts/${WORKOUT_ID}/sets`, 'POST', JSON.stringify(set)],
        [`/api/workouts/${WORKOUT_ID}/finish`, 'POST', JSON.stringify(finish)],
      ])
    })
  })
})

const FINISH_BODY = { finishedAt: '2026-11-21T19:20:00.000Z', endReason: 'ended_early' as const }

function retryingQueue() {
  const send = vi.fn<() => Promise<SendOutcome>>().mockResolvedValue({ status: 'retry' })
  return { send, queue: createSyncQueue({ store: createMemoryQueueStore(), send }) }
}

describe('Given two sets and a finish waiting in the queue', () => {
  describe('When the indicator renders', () => {
    it('Then should read "2 séries aguardando envio"', async () => {
      const { queue } = retryingQueue()
      await queue.enqueue(WORKOUT_ID, pendingSetBody({ id: 'set-1' }))
      await queue.enqueue(WORKOUT_ID, pendingSetBody({ id: 'set-2', setNumber: 2 }))
      await queue.enqueueFinish(WORKOUT_ID, FINISH_BODY)

      render(
        <SyncProvider queue={queue}>
          <PendingSetsIndicator />
        </SyncProvider>,
      )

      expect(screen.getByRole('status').textContent).toBe('2 séries aguardando envio')
    })
  })
})

describe('Given only the finish waiting in the queue', () => {
  describe('When the indicator renders and the retry interval elapses', () => {
    it('Then should show no indicator and still send the finish again', async () => {
      vi.useFakeTimers()
      const { queue, send } = retryingQueue()
      await queue.enqueueFinish(WORKOUT_ID, FINISH_BODY)
      await queue.flush()
      send.mockClear()

      render(
        <SyncProvider queue={queue}>
          <PendingSetsIndicator />
        </SyncProvider>,
      )
      await act(async () => {
        await vi.advanceTimersByTimeAsync(SYNC_RETRY_INTERVAL_MS)
      })

      expect({
        indicator: screen.queryByRole('status'),
        resent: send.mock.calls.length > 0,
      }).toEqual({ indicator: null, resent: true })
    })
  })
})
