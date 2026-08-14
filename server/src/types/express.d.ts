import 'express'

declare global {
  namespace Express {
    interface Request {
      // Set by requireAuth once a session cookie is verified. Not yet
      // consumed by any data route (see #47) — the plumbing for a
      // follow-up issue to scope Budget/Expense/Category per user.
      userId?: string
    }
  }
}
