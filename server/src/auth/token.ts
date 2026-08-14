import jwt from 'jsonwebtoken'
import { getJwtSecret } from './config.js'

export const SESSION_COOKIE_NAME = 'session'

// Long enough not to demand frequent re-login for a personal app, short
// enough to bound a leaked cookie's lifetime.
const SESSION_EXPIRY = '7d'
export const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

export function signSession(userId: string): string {
  const jwtSecret = getJwtSecret()
  return jwt.sign({ sub: userId }, jwtSecret, { expiresIn: SESSION_EXPIRY })
}

// Returns the session's user id if the token is valid, null otherwise.
export function verifySession(token: string): string | null {
  const jwtSecret = getJwtSecret()
  try {
    const payload = jwt.verify(token, jwtSecret)
    if (typeof payload === 'object' && payload !== null && typeof payload.sub === 'string') {
      return payload.sub
    }
    return null
  } catch {
    return null
  }
}
