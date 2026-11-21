import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SyncProvider, useSyncQueue, useSyncSnapshot } from './sync-context'
import { pendingSetBody } from './test-sets'

vi.mock('./local-db', () => ({
  openLocalDb: async () => null,
  getLocalDb: async () => null,
}))

const WORKOUT_ID = '0193a1b2-0000-7000-8000-000000000601'

function RecordButton() {
  const queue = useSyncQueue()
  const { pending } = useSyncSnapshot()
  return (
    <>
      <button
        type="button"
        onClick={() => void queue.enqueue(WORKOUT_ID, pendingSetBody({ id: 'set-1' }))}
      >
        Record
      </button>
      <p role="status">{`${pending.length} pending`}</p>
    </>
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('Given IndexedDB exists but the database cannot be opened', () => {
  describe('When a set is enqueued while the network fails and the connection then returns', () => {
    it('Then the set should be held in memory and sent once the online event fires', async () => {
      vi.stubGlobal('indexedDB', {})
      const fetchMock = vi
        .fn()
        .mockRejectedValueOnce(new TypeError('Failed to fetch')) // the enqueue
        .mockResolvedValue(new Response('{}', { status: 201 }))
      vi.stubGlobal('fetch', fetchMock)

      render(
        <SyncProvider>
          <RecordButton />
        </SyncProvider>,
      )
      fireEvent.click(screen.getByRole('button', { name: 'Record' }))
      await vi.waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('1 pending'))
      await act(async () => {
        window.dispatchEvent(new Event('online'))
      })

      await vi.waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('0 pending'))
      expect(fetchMock).toHaveBeenCalledWith(
        `/api/workouts/${WORKOUT_ID}/sets`,
        expect.objectContaining({ method: 'POST' }),
      )
    })
  })
})
