import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from '@simplewebauthn/server'
import type { StoredCredential, WebAuthnVerifier } from '../modules/auth/webauthn.js'

export type FakeOutcome = 'accept' | 'refuse' | 'throw'

export type FakeWebAuthnOptions = {
  registration?: FakeOutcome
  authentication?: FakeOutcome
  newCounter?: number
}

export type FakeWebAuthnCalls = {
  verifyAuthentication: { expectedChallenge: string; credential: StoredCredential }[]
}

export const FAKE_PUBLIC_KEY = new Uint8Array([0xa5, 0x01, 0x02])

// Ceremony responses carry the challenge in clientDataJSON, like a browser would.
export function fakeCeremonyResponse(challenge: string, credentialId = 'ZmFrZS1jcmVkZW50aWFs') {
  const clientData = { type: 'webauthn.fake', challenge, origin: 'http://localhost:8080' }
  return {
    id: credentialId,
    rawId: credentialId,
    type: 'public-key',
    clientExtensionResults: {},
    response: { clientDataJSON: Buffer.from(JSON.stringify(clientData)).toString('base64url') },
  }
}

function failure(outcome: FakeOutcome, expectedChallenge: string): { verified: false } {
  if (outcome === 'throw') {
    throw new Error(`Unexpected response challenge "${expectedChallenge}"`)
  }
  return { verified: false }
}

export function createFakeWebAuthn(options: FakeWebAuthnOptions = {}): {
  verifier: WebAuthnVerifier
  calls: FakeWebAuthnCalls
} {
  const calls: FakeWebAuthnCalls = { verifyAuthentication: [] }
  const verifier: WebAuthnVerifier = {
    createRegistrationOptions: async ({ challenge, userId, excludeCredentials }) =>
      ({
        challenge,
        rp: { id: 'localhost', name: 'Heavy Duty' },
        user: {
          id: Buffer.from(userId).toString('base64url'),
          name: 'Heavy Duty',
          displayName: '',
        },
        pubKeyCredParams: [],
        excludeCredentials: excludeCredentials.map((credential) => ({
          id: credential.credentialId,
          type: 'public-key',
        })),
      }) as PublicKeyCredentialCreationOptionsJSON,

    verifyRegistration: async ({ response, expectedChallenge }) => {
      const outcome = options.registration ?? 'accept'
      if (outcome !== 'accept') return failure(outcome, expectedChallenge)
      const credentialId = (response as { id: string }).id
      return {
        verified: true,
        credential: {
          credentialId,
          publicKey: FAKE_PUBLIC_KEY,
          counter: 0,
          transports: ['internal'],
        },
      }
    },

    createAuthenticationOptions: async ({ challenge }) =>
      ({
        challenge,
        rpId: 'localhost',
        userVerification: 'required',
      }) as PublicKeyCredentialRequestOptionsJSON,

    verifyAuthentication: async ({ expectedChallenge, credential }) => {
      calls.verifyAuthentication.push({ expectedChallenge, credential })
      const outcome = options.authentication ?? 'accept'
      if (outcome !== 'accept') return failure(outcome, expectedChallenge)
      return { verified: true, newCounter: options.newCounter ?? credential.counter + 1 }
    },
  }
  return { verifier, calls }
}
