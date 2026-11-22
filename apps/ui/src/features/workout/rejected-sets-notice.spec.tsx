import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { createMemoryQueueStore } from '@/sync/queue-store'
import { SyncProvider } from '@/sync/sync-context'
import { createSyncQueue } from '@/sync/sync-queue'
import { pendingSetBody } from '@/sync/test-sets'
import { RejectedSetsNotice } from './rejected-sets-notice'

const WORKOUT_ID = '0193a1b2-0000-7000-8000-000000000601'
const MESSAGE = 'exercício do programa não encontrado'

async function rejectedQueue(count: number) {
  const queue = createSyncQueue({
    store: createMemoryQueueStore(),
    send: async () => ({
      status: 'rejected',
      code: 'planned_exercise_not_found',
      message: MESSAGE,
    }),
  })
  for (let index = 0; index < count; index += 1) {
    await queue.enqueue(WORKOUT_ID, pendingSetBody({ id: `set-${index}`, setNumber: index + 1 }))
  }
  await queue.flush()
  return queue
}

describe('Given a set rejected with "exercício do programa não encontrado"', () => {
  describe('When the notice renders and the athlete taps Dispensar', () => {
    it('Then should show the message without a text field, and then the notice should disappear with the rejected list empty', async () => {
      const queue = await rejectedQueue(1)
      render(
        <SyncProvider queue={queue}>
          <RejectedSetsNotice />
        </SyncProvider>,
      )
      const shown = {
        message: screen.queryByText(MESSAGE) !== null,
        textboxes: screen.queryAllByRole('textbox').length,
      }

      await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Dispensar' })))

      expect({
        shown,
        notice: screen.queryByRole('alert'),
        rejected: queue.getSnapshot().rejected,
      }).toEqual({ shown: { message: true, textboxes: 0 }, notice: null, rejected: [] })
    })
  })
})

describe('Given three sets rejected for the same reason', () => {
  describe('When the notice renders', () => {
    it('Then should show one notice with the count and the message once', async () => {
      render(
        <SyncProvider queue={await rejectedQueue(3)}>
          <RejectedSetsNotice />
        </SyncProvider>,
      )

      expect({
        alerts: screen.getAllByRole('alert').length,
        count: screen.getByRole('alert').textContent?.includes('3 séries recusadas'),
        messages: screen.getAllByText(MESSAGE).length,
      }).toEqual({ alerts: 1, count: true, messages: 1 })
    })
  })
})

describe('Given a refused set', () => {
  describe('When the notice renders', () => {
    it('Then the icon should be hidden from the accessibility tree and Dispensar should stay a button', async () => {
      render(
        <SyncProvider queue={await rejectedQueue(1)}>
          <RejectedSetsNotice />
        </SyncProvider>,
      )

      expect({
        icon: screen.getByRole('alert').querySelector('svg')?.getAttribute('aria-hidden'),
        dismiss: screen.getByRole('button', { name: 'Dispensar' }).tagName,
      }).toEqual({ icon: 'true', dismiss: 'BUTTON' })
    })
  })
})
