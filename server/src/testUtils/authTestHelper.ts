import { randomUUID } from 'node:crypto'
import request from 'supertest'
import type { Express } from 'express'
import User from '../models/User.js'

export function setTestAuthEnv(): void {
  process.env.AUTH_JWT_SECRET = 'test-jwt-secret-do-not-use-in-prod'
}

export interface AuthenticatedAgent {
  agent: ReturnType<typeof request.agent>
  userId: string
}

// Signs up a fresh, uniquely-named user (so repeated calls within the
// same test file never collide on User's unique username index, even
// without cleanup between tests) and returns a supertest agent that
// carries the resulting session cookie on every subsequent request,
// plus the real user id — needed for tests that stamp fixture
// documents (Category/Budget/Expense) directly via the model, bypassing
// the routes. Looked up via the model, not GET /api/auth/me, which
// intentionally never exposes the internal Mongo id over the API.
export async function getAuthenticatedAgent(app: Express): Promise<AuthenticatedAgent> {
  setTestAuthEnv()
  const username = `test-user-${randomUUID()}`
  const agent = request.agent(app)
  await agent.post('/api/auth/signup').send({ id: username, password: 'test-password-1234' })
  const user = await User.findOne({ username })
  return { agent, userId: user!._id.toString() }
}
