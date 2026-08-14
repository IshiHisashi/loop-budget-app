let cachedJwtSecret: string | undefined

// Read lazily (on first real use) rather than at module-import time —
// test files import app.js before any beforeAll runs, so validating at
// import time would run before tests get a chance to set test env vars.
// The real fail-fast-at-startup requirement is met separately by
// server/src/index.ts calling this once at boot.
export function getJwtSecret(): string {
  if (cachedJwtSecret) return cachedJwtSecret

  const jwtSecret = process.env.AUTH_JWT_SECRET
  if (!jwtSecret) {
    throw new Error('AUTH_JWT_SECRET must be set — see server/.env.example')
  }

  cachedJwtSecret = jwtSecret
  return cachedJwtSecret
}

let cachedClientOrigin: string | undefined

// Same fail-fast-at-boot intent as getAuthConfig() — app.ts reads
// process.env.CLIENT_ORIGIN directly (not this function) so its cors()
// setup keeps working at module-import time in tests that never set
// CLIENT_ORIGIN. This function exists purely for index.ts to call once
// at real-server boot, so a deployment that forgets CLIENT_ORIGIN
// refuses to start instead of silently serving with wildcard CORS.
export function getClientOrigin(): string {
  if (cachedClientOrigin) return cachedClientOrigin

  const clientOrigin = process.env.CLIENT_ORIGIN
  if (!clientOrigin) {
    throw new Error('CLIENT_ORIGIN must be set — see server/.env.example')
  }

  cachedClientOrigin = clientOrigin
  return cachedClientOrigin
}
