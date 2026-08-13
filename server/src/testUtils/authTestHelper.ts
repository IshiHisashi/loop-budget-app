import request from 'supertest'
import bcrypt from 'bcryptjs'
import type { Express } from 'express'

export const TEST_AUTH_ID = 'test-user'
export const TEST_AUTH_PASSWORD = 'test-password'

// A low cost factor keeps test hashing fast — the real deployment
// generates its hash separately (see .env.example), this only needs to
// be a valid bcrypt hash for the login route to check against.
export function setTestAuthEnv(): void {
  process.env.AUTH_ID = TEST_AUTH_ID
  process.env.AUTH_PASSWORD_HASH = bcrypt.hashSync(TEST_AUTH_PASSWORD, 4)
  process.env.AUTH_JWT_SECRET = 'test-jwt-secret-do-not-use-in-prod'
}

// Sets the test auth env vars and returns a supertest agent that has
// already logged in and will carry the session cookie on every
// subsequent request made through it.
export async function getAuthenticatedAgent(
  app: Express
): Promise<ReturnType<typeof request.agent>> {
  setTestAuthEnv()
  const agent = request.agent(app)
  await agent.post('/api/auth/login').send({ id: TEST_AUTH_ID, password: TEST_AUTH_PASSWORD })
  return agent
}
