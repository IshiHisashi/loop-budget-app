import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import request from 'supertest'
import app from '../app.js'
import {
  getAuthenticatedAgent,
  setTestAuthEnv,
  TEST_AUTH_ID,
  TEST_AUTH_PASSWORD,
} from '../testUtils/authTestHelper.js'

let mongod: MongoMemoryServer

beforeAll(async () => {
  mongod = await MongoMemoryServer.create()
  await mongoose.connect(mongod.getUri())
})

afterAll(async () => {
  await mongoose.disconnect()
  await mongod.stop()
})

describe('POST /api/auth/login', () => {
  it('sets a session cookie and returns 200 for correct credentials', async () => {
    setTestAuthEnv()

    const res = await request(app)
      .post('/api/auth/login')
      .send({ id: TEST_AUTH_ID, password: TEST_AUTH_PASSWORD })

    expect(res.status).toBe(200)
    expect(res.headers['set-cookie']?.[0]).toMatch(/^session=/)
  })

  it('rejects a wrong id with a generic 401 message', async () => {
    setTestAuthEnv()

    const res = await request(app)
      .post('/api/auth/login')
      .send({ id: 'not-the-user', password: TEST_AUTH_PASSWORD })

    expect(res.status).toBe(401)
    expect(res.body).toEqual({ error: 'invalid credentials' })
  })

  it('rejects a wrong password with the same generic 401 message', async () => {
    setTestAuthEnv()

    const res = await request(app)
      .post('/api/auth/login')
      .send({ id: TEST_AUTH_ID, password: 'wrong-password' })

    expect(res.status).toBe(401)
    expect(res.body).toEqual({ error: 'invalid credentials' })
  })

  it('rejects missing fields with 400', async () => {
    setTestAuthEnv()

    const res = await request(app).post('/api/auth/login').send({ id: TEST_AUTH_ID })

    expect(res.status).toBe(400)
  })
})

describe('GET /api/auth/me', () => {
  it('returns 200 with a valid session cookie', async () => {
    const agent = await getAuthenticatedAgent(app)

    const res = await agent.get('/api/auth/me')

    expect(res.status).toBe(200)
  })

  it('returns 401 without a session cookie', async () => {
    setTestAuthEnv()

    const res = await request(app).get('/api/auth/me')

    expect(res.status).toBe(401)
  })
})

describe('POST /api/auth/logout', () => {
  it('clears the session cookie so a subsequent /me is unauthenticated', async () => {
    const agent = await getAuthenticatedAgent(app)

    const logoutRes = await agent.post('/api/auth/logout')
    expect(logoutRes.status).toBe(200)

    const meRes = await agent.get('/api/auth/me')
    expect(meRes.status).toBe(401)
  })
})

describe('protected data routes', () => {
  it('returns 401 for an unauthenticated request to a protected route', async () => {
    setTestAuthEnv()

    const res = await request(app).get('/api/categories')

    expect(res.status).toBe(401)
  })

  it('GET /api/health stays public', async () => {
    setTestAuthEnv()

    const res = await request(app).get('/api/health')

    expect(res.status).toBe(200)
  })
})
