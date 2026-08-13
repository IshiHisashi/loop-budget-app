import cookieParser from 'cookie-parser'
import cors from 'cors'
import express, { NextFunction, Request, Response } from 'express'
import healthRouter from './routes/health.js'
import authRouter from './routes/auth.js'
import categoriesRouter from './routes/categories.js'
import budgetsRouter from './routes/budgets.js'
import expensesRouter from './routes/expenses.js'
import budgetVsActualRouter from './routes/budgetVsActual.js'
import { requireAuth } from './middleware/requireAuth.js'

const app = express()

// The app is gated behind a single-user login (VISION.md) since it may
// be reachable beyond just the owner's own machine — the session cookie
// needs to be sent cross-origin between the Vite dev server and this
// API, which requires a specific allowed origin plus `credentials: true`
// (a wildcard origin can't be combined with credentialed requests).
// Read directly from process.env (not the validated getClientOrigin())
// so this keeps working at module-import time in tests, which never set
// CLIENT_ORIGIN — index.ts's real-server boot path separately calls
// getClientOrigin() to fail fast if it's unset, same as auth config.
app.use(cors({ origin: process.env.CLIENT_ORIGIN, credentials: true }))
app.use(express.json())
app.use(cookieParser())
app.use('/api', healthRouter)
app.use('/api/auth', authRouter)
// Everything mounted below this point is protected by default, so any
// future route added here is automatically covered unless deliberately
// mounted above this line (safer default than opting each router in).
app.use('/api', requireAuth)
app.use('/api/categories', categoriesRouter)
app.use('/api/budgets', budgetsRouter)
app.use('/api/expenses', expensesRouter)
app.use('/api/budget-vs-actual', budgetVsActualRouter)

// Express identifies error-handling middleware by its 4-arg signature —
// `next` must stay in the signature even though it's unused here.
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  // Route-level checks are meant to catch invalid input before it ever
  // reaches a model, but a ValidationError getting through anyway
  // (a route/schema constraint drifting out of sync, a check that was
  // missed) is still a bad-request problem, not a server failure —
  // this is the backstop so that case is a clean 400, not a 500.
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message })
  }
  if (err.name === 'MongooseError' || err.name === 'MongoServerSelectionError') {
    return res.status(503).json({ error: 'database unavailable' })
  }
  console.error(err)
  res.status(500).json({ error: 'internal server error' })
})

export default app
