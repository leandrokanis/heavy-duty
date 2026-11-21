import {
  type AuthenticationResponseJSON,
  generateAuthenticationOptions,
  generateRegistrationOptions,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
  type RegistrationResponseJSON,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server'

export type CredentialDescriptor = {
  credentialId: string
  transports: string[] | undefined
}

export type StoredCredential = CredentialDescriptor & {
  publicKey: Uint8Array
  counter: number
}

export type RegistrationResult =
  | { verified: true; credential: StoredCredential }
  | { verified: false }

export type AuthenticationResult = { verified: true; newCounter: number } | { verified: false }

// Port over @simplewebauthn/server; route specs replace it with src/test/webauthn.ts, see ADR-019.
export type WebAuthnVerifier = {
  createRegistrationOptions: (input: {
    challenge: string
    userId: Uint8Array
    excludeCredentials: CredentialDescriptor[]
  }) => Promise<PublicKeyCredentialCreationOptionsJSON>
  verifyRegistration: (input: {
    response: unknown
    expectedChallenge: string
  }) => Promise<RegistrationResult>
  createAuthenticationOptions: (input: {
    challenge: string
  }) => Promise<PublicKeyCredentialRequestOptionsJSON>
  verifyAuthentication: (input: {
    response: unknown
    expectedChallenge: string
    credential: StoredCredential
  }) => Promise<AuthenticationResult>
}

export type WebAuthnConfig = {
  appOrigin: string
  rpId: string
}

const RP_NAME = 'Heavy Duty'
const USER_NAME = 'Heavy Duty'
const CEREMONY_TIMEOUT_MS = 5 * 60 * 1000

export function createWebAuthnVerifier(config: WebAuthnConfig): WebAuthnVerifier {
  return {
    createRegistrationOptions: ({ challenge, userId, excludeCredentials }) =>
      generateRegistrationOptions({
        rpName: RP_NAME,
        rpID: config.rpId,
        userName: USER_NAME,
        userID: Uint8Array.from(userId),
        challenge: challengeBytes(challenge),
        timeout: CEREMONY_TIMEOUT_MS,
        attestationType: 'none',
        excludeCredentials: excludeCredentials.map((credential) => ({
          id: credential.credentialId,
          transports: credential.transports,
        })),
        authenticatorSelection: { residentKey: 'required', userVerification: 'required' },
      }),

    async verifyRegistration({ response, expectedChallenge }) {
      const result = await verifyRegistrationResponse({
        response: response as RegistrationResponseJSON,
        expectedChallenge,
        expectedOrigin: config.appOrigin,
        expectedRPID: config.rpId,
        requireUserVerification: true,
      })
      if (!result.verified) return { verified: false }
      const { credential } = result.registrationInfo
      return {
        verified: true,
        credential: {
          credentialId: credential.id,
          publicKey: credential.publicKey,
          counter: credential.counter,
          transports: credential.transports,
        },
      }
    },

    createAuthenticationOptions: ({ challenge }) =>
      generateAuthenticationOptions({
        rpID: config.rpId,
        challenge: challengeBytes(challenge),
        timeout: CEREMONY_TIMEOUT_MS,
        userVerification: 'required',
      }),

    async verifyAuthentication({ response, expectedChallenge, credential }) {
      const result = await verifyAuthenticationResponse({
        response: response as AuthenticationResponseJSON,
        expectedChallenge,
        expectedOrigin: config.appOrigin,
        expectedRPID: config.rpId,
        requireUserVerification: true,
        credential: {
          id: credential.credentialId,
          publicKey: Uint8Array.from(credential.publicKey),
          counter: credential.counter,
          transports: credential.transports,
        },
      })
      return result.verified
        ? { verified: true, newCounter: result.authenticationInfo.newCounter }
        : { verified: false }
    },
  }
}

// A string challenge would be UTF-8 encoded by the library, so the base64url value goes as bytes.
function challengeBytes(challenge: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(Buffer.from(challenge, 'base64url'))
}

// The challenge is read only to find it in the store; the library checks it again.
export function readChallenge(response: unknown): string | undefined {
  const clientDataJSON = readResponseField(response, 'clientDataJSON')
  if (clientDataJSON === undefined) return undefined
  try {
    const clientData: unknown = JSON.parse(
      Buffer.from(clientDataJSON, 'base64url').toString('utf8'),
    )
    const challenge = (clientData as { challenge?: unknown } | null)?.challenge
    return typeof challenge === 'string' ? challenge : undefined
  } catch {
    return undefined
  }
}

export function readCredentialId(response: unknown): string | undefined {
  const id = (response as { id?: unknown } | null)?.id
  return typeof id === 'string' ? id : undefined
}

function readResponseField(response: unknown, field: string): string | undefined {
  const inner = (response as { response?: Record<string, unknown> } | null)?.response
  const value = inner?.[field]
  return typeof value === 'string' ? value : undefined
}
