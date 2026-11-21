import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { createWebAuthnVerifier, readChallenge } from './webauthn.js'

const APP_ORIGIN = 'http://localhost:3100'
const CHALLENGE = 'c2VydmVyLWNoYWxsZW5nZS1mb3ItdGhlLXRlc3QtMDAwMQ'
const USER_ID = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8])
const STORED_CREDENTIAL_ID = 'c3RvcmVkLWNyZWRlbnRpYWw'

const FLAG_USER_PRESENT = 0x01
const FLAG_USER_VERIFIED = 0x04

function base64url(value: string | Uint8Array): string {
  return Buffer.from(value).toString('base64url')
}

function clientDataJSON(type: string, origin: string): string {
  return base64url(JSON.stringify({ type, challenge: CHALLENGE, origin, crossOrigin: false }))
}

function authenticatorData(rpId: string, flags: number, counter: number): Buffer {
  const counterBytes = Buffer.alloc(4)
  counterBytes.writeUInt32BE(counter)
  const rpIdHash = createHash('sha256').update(rpId).digest()
  return Buffer.concat([rpIdHash, Buffer.from([flags]), counterBytes])
}

// Minimal CBOR map { fmt: 'none', attStmt: {}, authData } for an attestation object.
function noneAttestationObject(authData: Buffer): string {
  const text = (value: string) =>
    Buffer.concat([Buffer.from([0x60 + value.length]), Buffer.from(value)])
  const bytes = Buffer.concat([Buffer.from([0x58, authData.length]), authData])
  return base64url(
    Buffer.concat([
      Buffer.from([0xa3]),
      text('fmt'),
      text('none'),
      text('attStmt'),
      Buffer.from([0xa0]),
      text('authData'),
      bytes,
    ]),
  )
}

function registrationResponse(origin: string, authData: Buffer) {
  return {
    id: 'bmV3LWNyZWRlbnRpYWw',
    rawId: 'bmV3LWNyZWRlbnRpYWw',
    type: 'public-key',
    clientExtensionResults: {},
    response: {
      clientDataJSON: clientDataJSON('webauthn.create', origin),
      attestationObject: noneAttestationObject(authData),
    },
  }
}

function authenticationResponse(origin: string, authData: Buffer) {
  return {
    id: STORED_CREDENTIAL_ID,
    rawId: STORED_CREDENTIAL_ID,
    type: 'public-key',
    clientExtensionResults: {},
    response: {
      clientDataJSON: clientDataJSON('webauthn.get', origin),
      authenticatorData: base64url(authData),
      signature: base64url('not-a-signature'),
    },
  }
}

const verifier = createWebAuthnVerifier({ appOrigin: APP_ORIGIN, rpId: 'localhost' })
const storedCredential = {
  credentialId: STORED_CREDENTIAL_ID,
  publicKey: new Uint8Array([0xa0]),
  counter: 5,
  transports: ['internal'],
}

describe('Given APP_ORIGIN http://localhost:3100 and one stored credential', () => {
  describe('When registration options are created', () => {
    it('Then should require a resident key and user verification for RP ID localhost, with no attestation, the stored credential excluded and the given user id', async () => {
      const options = await verifier.createRegistrationOptions({
        challenge: CHALLENGE,
        userId: USER_ID,
        excludeCredentials: [{ credentialId: STORED_CREDENTIAL_ID, transports: ['internal'] }],
      })

      expect({
        rpId: options.rp.id,
        challenge: options.challenge,
        residentKey: options.authenticatorSelection?.residentKey,
        userVerification: options.authenticatorSelection?.userVerification,
        attestation: options.attestation,
        excludeCredentials: options.excludeCredentials?.map((credential) => credential.id),
        userId: options.user.id,
      }).toEqual({
        rpId: 'localhost',
        challenge: CHALLENGE,
        residentKey: 'required',
        userVerification: 'required',
        attestation: 'none',
        excludeCredentials: [STORED_CREDENTIAL_ID],
        userId: base64url(USER_ID),
      })
    })
  })

  describe('When authentication options are created', () => {
    it('Then should require user verification for RP ID localhost without listing credentials', async () => {
      const options = await verifier.createAuthenticationOptions({ challenge: CHALLENGE })

      expect({
        rpId: options.rpId,
        challenge: options.challenge,
        userVerification: options.userVerification,
        allowCredentials: options.allowCredentials ?? [],
      }).toEqual({
        rpId: 'localhost',
        challenge: CHALLENGE,
        userVerification: 'required',
        allowCredentials: [],
      })
    })
  })
})

describe('Given a registration response', () => {
  describe('When it comes from another origin', () => {
    it('Then the verification should reject it for the origin', async () => {
      const response = registrationResponse(
        'https://evil.example',
        authenticatorData('localhost', FLAG_USER_PRESENT | FLAG_USER_VERIFIED, 0),
      )

      await expect(
        verifier.verifyRegistration({ response, expectedChallenge: CHALLENGE }),
      ).rejects.toThrow(/origin/)
    })
  })

  describe('When the authenticator data belongs to another RP ID', () => {
    it('Then the verification should reject it for the RP ID', async () => {
      const response = registrationResponse(
        APP_ORIGIN,
        authenticatorData('evil.example', FLAG_USER_PRESENT | FLAG_USER_VERIFIED, 0),
      )

      await expect(
        verifier.verifyRegistration({ response, expectedChallenge: CHALLENGE }),
      ).rejects.toThrow(/RP ID/)
    })
  })

  describe('When the user was present but not verified', () => {
    it('Then the verification should reject it for user verification', async () => {
      const response = registrationResponse(
        APP_ORIGIN,
        authenticatorData('localhost', FLAG_USER_PRESENT, 0),
      )

      await expect(
        verifier.verifyRegistration({ response, expectedChallenge: CHALLENGE }),
      ).rejects.toThrow(/User verification was required/)
    })
  })

  describe('When it answers another challenge', () => {
    it('Then the verification should reject it for the challenge', async () => {
      const response = registrationResponse(
        APP_ORIGIN,
        authenticatorData('localhost', FLAG_USER_PRESENT | FLAG_USER_VERIFIED, 0),
      )

      await expect(
        verifier.verifyRegistration({ response, expectedChallenge: 'b3RoZXItY2hhbGxlbmdl' }),
      ).rejects.toThrow(/challenge/)
    })
  })
})

describe('Given an authentication response for a stored credential with counter 5', () => {
  describe('When it comes from another origin', () => {
    it('Then the verification should reject it for the origin', async () => {
      const response = authenticationResponse(
        'https://evil.example',
        authenticatorData('localhost', FLAG_USER_PRESENT | FLAG_USER_VERIFIED, 6),
      )

      await expect(
        verifier.verifyAuthentication({
          response,
          expectedChallenge: CHALLENGE,
          credential: storedCredential,
        }),
      ).rejects.toThrow(/origin/)
    })
  })

  describe('When the authenticator data belongs to another RP ID', () => {
    it('Then the verification should reject it for the RP ID', async () => {
      const response = authenticationResponse(
        APP_ORIGIN,
        authenticatorData('evil.example', FLAG_USER_PRESENT | FLAG_USER_VERIFIED, 6),
      )

      await expect(
        verifier.verifyAuthentication({
          response,
          expectedChallenge: CHALLENGE,
          credential: storedCredential,
        }),
      ).rejects.toThrow(/RP ID/)
    })
  })

  describe('When the user was present but not verified', () => {
    it('Then the verification should reject it for user verification', async () => {
      const response = authenticationResponse(
        APP_ORIGIN,
        authenticatorData('localhost', FLAG_USER_PRESENT, 6),
      )

      await expect(
        verifier.verifyAuthentication({
          response,
          expectedChallenge: CHALLENGE,
          credential: storedCredential,
        }),
      ).rejects.toThrow(/User verification required/)
    })
  })

  describe('When the response counter is 4', () => {
    it('Then the verification should reject it because the counter went back', async () => {
      const response = authenticationResponse(
        APP_ORIGIN,
        authenticatorData('localhost', FLAG_USER_PRESENT | FLAG_USER_VERIFIED, 4),
      )

      await expect(
        verifier.verifyAuthentication({
          response,
          expectedChallenge: CHALLENGE,
          credential: storedCredential,
        }),
      ).rejects.toThrow(/counter value 4 was lower than expected 5/)
    })
  })
})

describe('Given a ceremony response', () => {
  describe('When its challenge is read', () => {
    it('Then should return the challenge of the clientDataJSON', () => {
      expect(readChallenge(registrationResponse(APP_ORIGIN, Buffer.alloc(0)))).toBe(CHALLENGE)
    })
  })

  describe('When the body has no clientDataJSON or an invalid one', () => {
    it('Then should return undefined', () => {
      expect([
        readChallenge({}),
        readChallenge(null),
        readChallenge({ response: { clientDataJSON: '%%%' } }),
        readChallenge({ response: { clientDataJSON: base64url('{"challenge":7}') } }),
      ]).toEqual([undefined, undefined, undefined, undefined])
    })
  })
})
