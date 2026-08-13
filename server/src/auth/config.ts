export interface AuthConfig {
  authId: string
  authPasswordHash: string
  authJwtSecret: string
}

let cachedConfig: AuthConfig | undefined

// Read lazily (on first real use) rather than at module-import time —
// test files import app.js before any beforeAll runs, so validating at
// import time would run before tests get a chance to set test env vars.
// The real fail-fast-at-startup requirement is met separately by
// server/src/index.ts calling this once at boot.
export function getAuthConfig(): AuthConfig {
  if (cachedConfig) return cachedConfig

  const authId = process.env.AUTH_ID
  const authPasswordHash = process.env.AUTH_PASSWORD_HASH
  const authJwtSecret = process.env.AUTH_JWT_SECRET

  if (!authId || !authPasswordHash || !authJwtSecret) {
    throw new Error('AUTH_ID, AUTH_PASSWORD_HASH, and AUTH_JWT_SECRET must all be set')
  }

  cachedConfig = { authId, authPasswordHash, authJwtSecret }
  return cachedConfig
}
