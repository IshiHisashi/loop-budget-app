import cors from 'cors'
import express, { NextFunction, Request, Response } from 'express'
import healthRouter from './routes/health.js'
import categoriesRouter from './routes/categories.js'
import budgetsRouter from './routes/budgets.js'
import expensesRouter from './routes/expenses.js'

const app = express()

// No auth or sensitive data in this app (single-device personal use per
// VISION.md) — permissive CORS costs nothing here and avoids dev/prod
// origin-mismatch friction a restrictive allowlist would add.
app.use(cors())
app.use(express.json())
app.use('/api', healthRouter)
app.use('/api/categories', categoriesRouter)
app.use('/api/budgets', budgetsRouter)
app.use('/api/expenses', expensesRouter)

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
