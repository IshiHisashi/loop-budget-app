import express from 'express'
import healthRouter from './routes/health.js'
import categoriesRouter from './routes/categories.js'

const app = express()

app.use(express.json())
app.use('/api', healthRouter)
app.use('/api/categories', categoriesRouter)

// Express identifies error-handling middleware by its 4-arg signature —
// `next` must stay in the signature even though it's unused here.
app.use((err, req, res, next) => {
  if (err.name === 'MongooseError' || err.name === 'MongoServerSelectionError') {
    return res.status(503).json({ error: 'database unavailable' })
  }
  console.error(err)
  res.status(500).json({ error: 'internal server error' })
})

export default app
