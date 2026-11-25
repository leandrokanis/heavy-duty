const UNSUBSCRIBE_PATH = '/api/email/unsubscribe'

// The API answers alike for a valid and an unknown token, so only the transport can fail here.
export async function turnEmailsOff(token: string): Promise<boolean> {
  try {
    const response = await fetch(UNSUBSCRIBE_PATH, {
      method: 'POST',
      credentials: 'omit',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token }),
    })
    return response.ok
  } catch {
    return false
  }
}
