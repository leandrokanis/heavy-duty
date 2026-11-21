import { createHash, timingSafeEqual } from 'node:crypto'

// RFC 7636 S256: the challenge is BASE64URL(SHA256(code_verifier)).
export function verifyS256(codeVerifier: string, codeChallenge: string): boolean {
  const computed = Buffer.from(createHash('sha256').update(codeVerifier).digest('base64url'))
  const expected = Buffer.from(codeChallenge)
  return computed.length === expected.length && timingSafeEqual(computed, expected)
}
