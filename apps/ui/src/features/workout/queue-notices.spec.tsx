import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { createMemoryQueueStore } from '@/sync/queue-store'
import { SyncProvider } from '@/sync/sync-context'
import { createSyncQueue } from '@/sync/sync-queue'
import { pendingSetBody } from '@/sync/test-sets'
import { QueueNotices } from './queue-notices'

async function queueWith({ refused, waiting }: { refused: number; waiting: number }) {
  const queue = createSyncQueue({
    store: createMemoryQueueStore(),
    send: async ({ id }) =>
      id.startsWith('refused')
        ? { status: 'rejected', code: 'planned_exercise_not_found', message: 'exercício removido' }
        : { status: 'retry' },
  })
  for (let index = 0; index < refused; index += 1) {
    await queue.enqueue(
      'workout-1',
      pendingSetBody({ id: `refused-${index}`, setNumber: index + 1 }),
    )
  }
  for (let index = 0; index < waiting; index += 1) {
    await queue.enqueue(
      'workout-1',
      pendingSetBody({ id: `waiting-${index}`, setNumber: refused + index + 1 }),
    )
  }
  await queue.flush()
  return queue
}

describe('Given 1 refused set and 2 sets waiting in the queue', () => {
  describe('When the notices render', () => {
    it('Then the alert of the refusal should come before the status of the queue', async () => {
      const queue = await queueWith({ refused: 1, waiting: 2 })
      render(
        <SyncProvider queue={queue}>
          <QueueNotices align="center" />
        </SyncProvider>,
      )

      const alert = screen.getByRole('alert')
      const status = screen.getByRole('status', { name: '2 séries aguardando envio' })
      expect(alert.compareDocumentPosition(status) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
        Node.DOCUMENT_POSITION_FOLLOWING,
      )
    })
  })
})

describe('Given no refused set and an empty queue', () => {
  describe('When the notices render', () => {
    it('Then the group should have no child element', async () => {
      const queue = await queueWith({ refused: 0, waiting: 0 })
      const { container } = render(
        <SyncProvider queue={queue}>
          <QueueNotices align="start" />
        </SyncProvider>,
      )

      expect(container.firstElementChild?.childElementCount).toBe(0)
    })
  })
})
