import { describe, expect, it } from 'vitest'
import { isApiRequest, runtimeCaching } from './sw-runtime-caching'

const SELF_ORIGIN = 'https://treino.example'

function matches(url: string): boolean {
  return isApiRequest({ url: new URL(url), sameOrigin: new URL(url).origin === SELF_ORIGIN })
}

describe('Given the API request matcher of the service worker', () => {
  describe('When it checks requests of the same and of another origin', () => {
    it('Then should match only same origin requests under /api/', () => {
      expect({
        api: matches(`${SELF_ORIGIN}/api/exercises`),
        home: matches(`${SELF_ORIGIN}/`),
        offline: matches(`${SELF_ORIGIN}/~offline`),
        otherOriginApi: matches('https://evil.example/api/exercises'),
      }).toEqual({ api: true, home: false, offline: false, otherOriginApi: false })
    })
  })
})

describe('Given the runtime caching rules', () => {
  describe('When the first rule is read', () => {
    it('Then should send API requests to the network only, before the default cache rules', () => {
      const [first] = runtimeCaching

      expect({
        matcher: first?.matcher === isApiRequest,
        handler: first?.handler.constructor.name,
        hasDefaults: runtimeCaching.length > 1,
      }).toEqual({ matcher: true, handler: 'NetworkOnly', hasDefaults: true })
    })
  })
})
