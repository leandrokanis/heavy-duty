import { createServer, type IncomingMessage, request, type ServerResponse } from 'node:http'

// One origin for the app and the API, as the WebAuthn RP ID requires; mirrors infra/caddy/Caddyfile.
const PROXY_PORT = Number(process.env.PROXY_PORT ?? 3100)
const WEB_PORT = Number(process.env.WEB_PORT ?? 3102)
const API_PORT = Number(process.env.API_PORT ?? 3101)
const UPSTREAM_HOST = '127.0.0.1'

function upstreamPort(path: string): number {
  return path.startsWith('/api/') || path === '/api' || path.startsWith('/mcp')
    ? API_PORT
    : WEB_PORT
}

function forward(incoming: IncomingMessage, outgoing: ServerResponse): void {
  const path = incoming.url ?? '/'
  const upstream = request(
    {
      host: UPSTREAM_HOST,
      port: upstreamPort(path),
      method: incoming.method,
      path,
      // The original Host header goes upstream, so the API sees the public origin.
      headers: incoming.headers,
    },
    (response) => {
      outgoing.writeHead(response.statusCode ?? 502, response.headers)
      response.pipe(outgoing)
    },
  )
  upstream.on('error', () => {
    if (!outgoing.headersSent) outgoing.writeHead(502)
    outgoing.end()
  })
  incoming.pipe(upstream)
}

// Browsers may resolve localhost to either loopback address.
for (const host of ['127.0.0.1', '::1']) {
  const server = createServer(forward)
  server.on('error', (error) => {
    if (host === '::1') return
    throw error
  })
  server.listen(PROXY_PORT, host, () => {
    console.log(`e2e proxy listening on ${host}:${PROXY_PORT}`)
  })
}
