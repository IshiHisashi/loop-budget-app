import 'dotenv/config'
import app from './app.js'
import { connectDB } from './db.js'
import { getJwtSecret, getClientOrigin } from './auth/config.js'

const PORT = process.env.PORT || 3001

// Unlike connectDB's graceful degradation, a missing auth secret is a
// security defect, not reduced functionality — refuse to start rather
// than run with auth silently broken. Caught here (rather than left as
// an unhandled exception) so the terminal shows a clean one-line
// message pointing at .env.example instead of a raw stack trace.
try {
  getJwtSecret()
  // Same reasoning as getAuthConfig() above: a missing CLIENT_ORIGIN
  // must not silently fall back to cors()'s wildcard-allow behavior, so
  // this is validated at boot rather than left to whatever app.ts's
  // cors() setup does with an unset value.
  getClientOrigin()
} catch (err) {
  console.error(err instanceof Error ? err.message : String(err))
  process.exit(1)
}

await connectDB(process.env.MONGODB_URI)

// Default categories are seeded per account at sign-up time now (see
// routes/auth.ts), not once globally at server boot.

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`)
})
