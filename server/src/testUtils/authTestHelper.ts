import { randomUUID } from 'node:crypto'
import request from 'supertest'
import type { Express } from 'express'

export function setTestAuthEnv(): void {
  process.env.AUTH_JWT_SECRET = 'test-jwt-secret-do-not-use-in-prod'
}

// Signs up a fresh, uniquely-named user (so repeated calls within the
// same test file never collide on User's unique username index, even
// without cleanup between tests) and returns a supertest agent that
// carries the resulting session cookie on every subsequent request.
export async function getAuthenticatedAgent(
  app: Express
): Promise<ReturnType<typeof request.agent>> {
  setTestAuthEnv()
  const username = `test-user-${randomUUID()}`
  const agent = request.agent(app)
  await agent.post('/api/auth/signup').send({ id: username, password: 'test-password-1234' })
  return agent
}
