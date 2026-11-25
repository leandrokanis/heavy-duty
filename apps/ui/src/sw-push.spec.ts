import { describe, expect, it, vi } from 'vitest'
import { noticeOf, openApp } from './sw-push'

describe('Given the data of a push message', () => {
  describe('When it carries a title, a body, a tag and the path of the app', () => {
    it('Then should show the title and the body under the tag, opening the path', () => {
      const data = {
        title: 'Letra B abre amanhã às 9h',
        body: 'costas e bíceps',
        tag: 'letter-B',
        url: '/',
      }

      expect(noticeOf(data)).toEqual({
        title: 'Letra B abre amanhã às 9h',
        options: {
          body: 'costas e bíceps',
          tag: 'letter-B',
          icon: '/icons/icon-192.png',
          data: { url: '/' },
        },
      })
    })
  })

  describe.each([
    ['no data', null],
    ['text instead of an object', 'oi'],
    ['an empty title', { title: '', body: 'x', tag: 't', url: '/' }],
  ])('When it carries %s', (_case, data) => {
    it('Then should still show a notification, so the browser keeps the permission', () => {
      expect(noticeOf(data)).toEqual({
        title: 'Heavy Duty',
        options: {
          body: 'Abra o app para ver o aviso.',
          tag: 'heavy-duty',
          icon: '/icons/icon-192.png',
          data: { url: '/' },
        },
      })
    })
  })

  describe('When the url points outside the app', () => {
    it('Then should open the workout of the day', () => {
      const data = { title: 'Aviso', body: 'x', tag: 't', url: 'https://outro.example.test/' }

      expect(noticeOf(data).options.data).toEqual({ url: '/' })
    })
  })
})

function windowClient(url: string) {
  return {
    url,
    focus: vi.fn(async () => undefined),
    navigate: vi.fn(async () => undefined),
  }
}

describe('Given the athlete taps a notice', () => {
  describe('When a window of the app is open', () => {
    it('Then should take it to the path and focus it, without a new window', async () => {
      const open = windowClient('https://app.example.test/historico')
      const clients = { matchAll: vi.fn(async () => [open]), openWindow: vi.fn() }

      await openApp(clients, '/')

      expect({
        navigate: open.navigate.mock.calls,
        focus: open.focus.mock.calls.length,
        opened: clients.openWindow.mock.calls.length,
      }).toEqual({ navigate: [['/']], focus: 1, opened: 0 })
    })
  })

  describe('When no window of the app is open', () => {
    it('Then should open a window on the path', async () => {
      const clients = { matchAll: vi.fn(async () => []), openWindow: vi.fn(async () => null) }

      await openApp(clients, '/')

      expect(clients.openWindow.mock.calls).toEqual([['/']])
    })
  })
})
