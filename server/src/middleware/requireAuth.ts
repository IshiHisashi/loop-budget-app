import { NextFunction, Request, Response } from 'express'
import { SESSION_COOKIE_NAME, verifySession } from '../auth/token.js'

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.[SESSION_COOKIE_NAME]
  const userId = typeof token === 'string' ? verifySession(token) : null
  if (!userId) {
    res.status(401).json({ error: 'authentication required' })
    return
  }
  req.userId = userId
  next()
}
