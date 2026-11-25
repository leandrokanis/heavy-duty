import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { NoticesSheet } from './notices-sheet'
import type { DeviceSubscription, PushDevice } from './push-device'
import type { PushSupport } from './push-support'

const ENDPOINT = 'https://push.example.test/send/phone'
const PUBLIC_KEY = 'test-public-key'

type FakeDeviceOptions = {
  support?: PushSupport
  permission?: NotificationPermission
  answer?: NotificationPermission
  subscribed?: boolean
}

function fakeDevice({
  support = 'supported',
  permission = 'default',
  answer = 'granted',
  subscribed = false,
}: FakeDeviceOptions = {}) {
  const unsubscribe = vi.fn(async () => true)
  const subscription: DeviceSubscription = {
    endpoint: ENDPOINT,
    body: () => ({ endpoint: ENDPOINT, keys: { p256dh: 'BKey', auth: 'Auth' } }),
    unsubscribe,
  }
  let current = subscribed ? subscription : null
  let granted = permission
  const device: PushDevice = {
    support: () => support,
    permission: () => granted,
    requestPermission: vi.fn(async () => {
      granted = answer
      return answer
    }),
    hasWorker: async () => true,
    getSubscription: async () => current,
    subscribe: vi.fn(async () => {
      current = subscription
      return subscription
    }),
  }
  return { device, unsubscribe }
}

function stubApi(
  pushKey: { configured: boolean; publicKey: string | null } = {
    configured: true,
    publicKey: PUBLIC_KEY,
  },
) {
  const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
    if (input === '/api/notifications/push-key') {
      return new Response(JSON.stringify(pushKey), { status: 200 })
    }
    return new Response(null, { status: init?.method ? 204 : 404 })
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function writesOf(fetchMock: ReturnType<typeof stubApi>) {
  return fetchMock.mock.calls
    .filter(([, init]) => init?.method)
    .map(([input, init]) => [init?.method, input, JSON.parse(String(init?.body)).endpoint])
}

async function findSwitch() {
  const dialog = await screen.findByRole('dialog', { name: 'Avisos' })
  return within(dialog).getByRole('button', { name: 'Avisos no celular' })
}

describe('Given the app is open in the browser, outside the home screen', () => {
  describe('When the athlete opens the notices sheet', () => {
    it('Then should show the switch unavailable with the reason to install the app', async () => {
      stubApi()
      render(
        <NoticesSheet
          open
          onClose={vi.fn()}
          device={fakeDevice({ support: 'not-installed' }).device}
        />,
      )

      const toggle = await findSwitch()

      await waitFor(() =>
        expect(toggle).toHaveAccessibleDescription('Instale o app na tela inicial.'),
      )
      expect([toggle.getAttribute('aria-pressed'), toggle.getAttribute('aria-disabled')]).toEqual([
        'false',
        'true',
      ])
    })
  })
})

describe('Given the installed app and a server without the push keys', () => {
  describe('When the athlete opens the notices sheet', () => {
    it('Then should show the switch unavailable with the reason of the server', async () => {
      stubApi({ configured: false, publicKey: null })
      render(<NoticesSheet open onClose={vi.fn()} device={fakeDevice().device} />)

      const toggle = await findSwitch()

      await waitFor(() =>
        expect(toggle).toHaveAccessibleDescription('Avisos não configurados no servidor.'),
      )
    })
  })
})

describe('Given the installed app with the notices off', () => {
  describe('When the athlete turns them on and accepts the permission', () => {
    it('Then should subscribe, send the subscription to the API and show the switch on', async () => {
      const fetchMock = stubApi()
      const { device } = fakeDevice()
      render(<NoticesSheet open onClose={vi.fn()} device={device} />)
      const toggle = await findSwitch()
      await waitFor(() => expect(toggle).not.toHaveAttribute('aria-disabled', 'true'))

      fireEvent.click(toggle)

      await waitFor(() => expect(toggle).toHaveAttribute('aria-pressed', 'true'))
      expect({
        subscribedWith: vi.mocked(device.subscribe).mock.calls,
        writes: writesOf(fetchMock),
      }).toEqual({
        subscribedWith: [[PUBLIC_KEY]],
        writes: [['PUT', '/api/notifications/push-subscriptions', ENDPOINT]],
      })
    })
  })

  describe('When the athlete turns them on and denies the permission', () => {
    it('Then should keep the switch off, with the note, and not subscribe', async () => {
      const fetchMock = stubApi()
      const { device } = fakeDevice({ answer: 'denied' })
      render(<NoticesSheet open onClose={vi.fn()} device={device} />)
      const toggle = await findSwitch()
      await waitFor(() => expect(toggle).not.toHaveAttribute('aria-disabled', 'true'))

      fireEvent.click(toggle)

      await waitFor(() =>
        expect(toggle).toHaveAccessibleDescription(
          'A permissão dos avisos foi negada nos ajustes do celular.',
        ),
      )
      expect({
        pressed: toggle.getAttribute('aria-pressed'),
        subscribed: vi.mocked(device.subscribe).mock.calls.length,
        writes: writesOf(fetchMock),
      }).toEqual({ pressed: 'false', subscribed: 0, writes: [] })
    })
  })
})

describe('Given the installed app with the notices on', () => {
  describe('When the athlete opens the notices sheet', () => {
    it('Then should show the switch on', async () => {
      stubApi()
      render(
        <NoticesSheet
          open
          onClose={vi.fn()}
          device={fakeDevice({ permission: 'granted', subscribed: true }).device}
        />,
      )

      const toggle = await findSwitch()

      await waitFor(() => expect(toggle).toHaveAttribute('aria-pressed', 'true'))
    })
  })

  describe('When the athlete turns them off', () => {
    it('Then should remove the subscription from the API and the browser and show the switch off', async () => {
      const fetchMock = stubApi()
      const { device, unsubscribe } = fakeDevice({ permission: 'granted', subscribed: true })
      render(<NoticesSheet open onClose={vi.fn()} device={device} />)
      const toggle = await findSwitch()
      await waitFor(() => expect(toggle).toHaveAttribute('aria-pressed', 'true'))

      fireEvent.click(toggle)

      await waitFor(() => expect(toggle).toHaveAttribute('aria-pressed', 'false'))
      expect({ writes: writesOf(fetchMock), unsubscribed: unsubscribe.mock.calls.length }).toEqual({
        writes: [['DELETE', '/api/notifications/push-subscriptions', ENDPOINT]],
        unsubscribed: 1,
      })
    })
  })
})

describe('Given the notices sheet is open', () => {
  describe('When the athlete taps Fechar', () => {
    it('Then should call onClose', async () => {
      stubApi()
      const onClose = vi.fn()
      render(<NoticesSheet open onClose={onClose} device={fakeDevice().device} />)

      fireEvent.click(await screen.findByRole('button', { name: 'Fechar' }))

      expect(onClose).toHaveBeenCalledTimes(1)
    })
  })
})

describe('Given a device whose browser APIs throw', () => {
  describe('When the athlete opens the notices sheet', () => {
    it('Then should show the switch unavailable as a device without notices', async () => {
      stubApi()
      const { device } = fakeDevice()
      render(
        <NoticesSheet
          open
          onClose={vi.fn()}
          device={{
            ...device,
            hasWorker: async () => {
              throw new Error('SecurityError')
            },
          }}
        />,
      )

      const toggle = await findSwitch()

      await waitFor(() =>
        expect(toggle).toHaveAccessibleDescription('Este aparelho não recebe avisos.'),
      )
    })
  })
})
