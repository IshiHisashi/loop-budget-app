import { Request, Response, Router } from 'express'
import bcrypt from 'bcryptjs'
import { getAuthConfig } from '../auth/config.js'
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_MS, signSession } from '../auth/token.js'
import { requireAuth } from '../middleware/requireAuth.js'

const router = Router()

function cookieOptions() {
  return {
    httpOnly: true,
    // Dev-safe defaults (plain HTTP, same-site Vite-to-API on localhost);
    // COOKIE_SECURE lets a future real deployment tighten this without a
    // code change.
    secure: process.env.COOKIE_SECURE === 'true',
    sameSite: 'lax' as const,
    maxAge: SESSION_MAX_AGE_MS,
  }
}

router.post('/login', async (req: Request, res: Response) => {
  const { id, password } = req.body

  if (typeof id !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'id and password are required' })
  }

  const { authId, authPasswordHash } = getAuthConfig()

  // Always run the bcrypt compare, even when `id` already doesn't match,
  // so a wrong id can't be distinguished from a wrong password by timing.
  const passwordMatches = await bcrypt.compare(password, authPasswordHash)
  if (id !== authId || !passwordMatches) {
    return res.status(401).json({ error: 'invalid credentials' })
  }

  const token = signSession()
  res.cookie(SESSION_COOKIE_NAME, token, cookieOptions())
  res.status(200).json({ ok: true })
})

router.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie(SESSION_COOKIE_NAME, cookieOptions())
  res.status(200).json({ ok: true })
})

router.get('/me', requireAuth, (_req: Request, res: Response) => {
  res.status(200).json({ ok: true })
})

export default router
