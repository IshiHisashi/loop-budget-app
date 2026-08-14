import { Request, Response, Router } from 'express'
import bcrypt from 'bcryptjs'
import User from '../models/User.js'
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_MS, signSession } from '../auth/token.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { seedDefaultCategoriesForUser } from '../seed/categories.js'

const router = Router()

const BCRYPT_COST = 10
const MIN_PASSWORD_LENGTH = 8

// Used as the compare target when no user exists, so a nonexistent
// account can't be distinguished from a wrong password by response
// timing — skipping the bcrypt compare entirely for a nonexistent
// account would be measurably faster than actually running one.
const DUMMY_PASSWORD_HASH = bcrypt.hashSync('dummy-password-for-timing-safety', BCRYPT_COST)

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

router.post('/signup', async (req: Request, res: Response) => {
  const { id, password } = req.body

  if (typeof id !== 'string' || !id.trim()) {
    return res.status(400).json({ error: 'id is required' })
  }
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    return res
      .status(400)
      .json({ error: `password must be at least ${MIN_PASSWORD_LENGTH} characters` })
  }

  const username = id.trim()

  const existing = await User.findOne({ username })
  if (existing) {
    return res.status(409).json({ error: 'that id is already taken' })
  }

  let user
  try {
    const passwordHash = await bcrypt.hash(password, BCRYPT_COST)
    user = await User.create({ username, passwordHash })
  } catch (err) {
    // Race with another signup for the same username between the
    // findOne check above and this create — the unique index catches
    // it, surfaced here as a clean 409 instead of falling through to
    // app.ts's generic error handler (which doesn't special-case
    // Mongo's duplicate-key error).
    if (err && typeof err === 'object' && 'code' in err && err.code === 11000) {
      return res.status(409).json({ error: 'that id is already taken' })
    }
    throw err
  }

  try {
    await seedDefaultCategoriesForUser(user._id)
  } catch (err) {
    // The user document above is already durably saved — if seeding
    // fails (a transient DB error, not a username race, since that's
    // already handled above), leaving it in place would permanently
    // squat this username with an account nobody ever got a session
    // for. Delete it so a retry can signup cleanly instead of forever
    // hitting "that id is already taken" for a broken account.
    await User.deleteOne({ _id: user._id })
    throw err
  }

  const token = signSession(user._id.toString())
  res.cookie(SESSION_COOKIE_NAME, token, cookieOptions())
  res.status(201).json({ ok: true })
})

router.post('/login', async (req: Request, res: Response) => {
  const { id, password } = req.body

  if (typeof id !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'id and password are required' })
  }

  const user = await User.findOne({ username: id })

  // Always run the bcrypt compare, even when no user was found, against
  // a fixed dummy hash — see DUMMY_PASSWORD_HASH above.
  const passwordMatches = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_PASSWORD_HASH)
  if (!user || !passwordMatches) {
    return res.status(401).json({ error: 'invalid credentials' })
  }

  const token = signSession(user._id.toString())
  res.cookie(SESSION_COOKIE_NAME, token, cookieOptions())
  res.status(200).json({ ok: true })
})

router.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie(SESSION_COOKIE_NAME, cookieOptions())
  res.status(200).json({ ok: true })
})

router.get('/me', requireAuth, async (req: Request, res: Response) => {
  const user = await User.findById(req.userId)
  if (!user) {
    return res.status(401).json({ error: 'authentication required' })
  }
  res.status(200).json({ id: user.username })
})

export default router
