import 'dotenv/config'
import mongoose from 'mongoose'
import app from './app.js'
import { connectDB } from './db.js'
import { seedDefaultCategories } from './seed/categories.js'
import { getAuthConfig, getClientOrigin } from './auth/config.js'

const PORT = process.env.PORT || 3001

// Unlike connectDB's graceful degradation, a missing auth secret is a
// security defect, not reduced functionality — refuse to start rather
// than run with auth silently broken.
getAuthConfig()

// Same reasoning as getAuthConfig() above: a missing CLIENT_ORIGIN must
// not silently fall back to cors()'s wildcard-allow behavior, so this
// is validated at boot rather than left to whatever app.ts's cors()
// setup does with an unset value.
getClientOrigin()

await connectDB(process.env.MONGODB_URI)

// connectDB() swallows connection errors so the server can still start
// without MongoDB (see /api/health's disconnected state). Seeding needs
// an actual connection first, or Category.countDocuments() would hang
// waiting on Mongoose's command buffer instead of failing fast.
if (mongoose.connection.readyState === 1) {
  await seedDefaultCategories()
} else {
  console.warn('Skipping category seeding: no MongoDB connection')
}

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`)
})
