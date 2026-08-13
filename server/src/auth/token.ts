import jwt from 'jsonwebtoken'
import { getAuthConfig } from './config.js'

export const SESSION_COOKIE_NAME = 'session'

// Long enough not to demand frequent re-login for a personal app, short
// enough to bound a leaked cookie's lifetime.
const SESSION_EXPIRY = '7d'
export const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

export function signSession(): string {
  const { authJwtSecret, authId } = getAuthConfig()
  return jwt.sign({ sub: authId }, authJwtSecret, { expiresIn: SESSION_EXPIRY })
}

export function verifySession(token: string): boolean {
  const { authJwtSecret, authId } = getAuthConfig()
  try {
    const payload = jwt.verify(token, authJwtSecret)
    return typeof payload === 'object' && payload !== null && payload.sub === authId
  } catch {
    return false
  }
}
