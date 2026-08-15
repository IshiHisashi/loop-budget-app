import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import request from 'supertest'
import app from '../app.js'
import User from '../models/User.js'
import * as categoriesSeed from '../seed/categories.js'
import { setTestAuthEnv } from '../testUtils/authTestHelper.js'

let mongod: MongoMemoryServer

beforeAll(async () => {
  mongod = await MongoMemoryServer.create()
  await mongoose.connect(mongod.getUri())
  setTestAuthEnv()
})

afterAll(async () => {
  await mongoose.disconnect()
  await mongod.stop()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('POST /api/auth/signup', () => {
  it('creates a user, sets a session cookie, and returns 201', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ id: 'alice', password: 'correct-horse' })

    expect(res.status).toBe(201)
    expect(res.headers['set-cookie']?.[0]).toMatch(/^session=/)
  })

  it('rejects a blank id with 400', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ id: '   ', password: 'correct-horse' })

    expect(res.status).toBe(400)
  })

  it('rejects a missing id with 400', async () => {
    const res = await request(app).post('/api/auth/signup').send({ password: 'correct-horse' })

    expect(res.status).toBe(400)
  })

  it('rejects a password shorter than 8 characters with 400', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ id: 'shortpw', password: 'short1' })

    expect(res.status).toBe(400)
  })

  it('rejects a duplicate id with 409', async () => {
    await request(app).post('/api/auth/signup').send({ id: 'bob', password: 'correct-horse' })

    const res = await request(app)
      .post('/api/auth/signup')
      .send({ id: 'bob', password: 'a-different-password' })

    expect(res.status).toBe(409)
  })

  it('rolls back the created user if seeding default categories fails, so a retry can succeed', async () => {
    const seedSpy = vi
      .spyOn(categoriesSeed, 'seedDefaultCategoriesForUser')
      .mockRejectedValueOnce(new Error('simulated transient DB failure'))

    const failedRes = await request(app)
      .post('/api/auth/signup')
      .send({ id: 'ivy', password: 'ivys-password' })

    expect(failedRes.status).toBe(500)
    expect(await User.findOne({ username: 'ivy' })).toBeNull()

    seedSpy.mockRestore()

    const retryRes = await request(app)
      .post('/api/auth/signup')
      .send({ id: 'ivy', password: 'ivys-password' })

    expect(retryRes.status).toBe(201)
  })
})

describe('POST /api/auth/login', () => {
  it('succeeds for a signed-up user with the correct credentials', async () => {
    await request(app)
      .post('/api/auth/signup')
      .send({ id: 'carol', password: 'carols-password' })

    const res = await request(app)
      .post('/api/auth/login')
      .send({ id: 'carol', password: 'carols-password' })

    expect(res.status).toBe(200)
    expect(res.headers['set-cookie']?.[0]).toMatch(/^session=/)
  })

  it('rejects a wrong password for an existing user with a generic 401 message', async () => {
    await request(app).post('/api/auth/signup').send({ id: 'dave', password: 'daves-password' })

    const res = await request(app)
      .post('/api/auth/login')
      .send({ id: 'dave', password: 'wrong-password' })

    expect(res.status).toBe(401)
    expect(res.body).toEqual({ error: 'invalid credentials' })
  })

  it('rejects a nonexistent id with the same generic 401 message', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ id: 'no-such-user', password: 'whatever12' })

    expect(res.status).toBe(401)
    expect(res.body).toEqual({ error: 'invalid credentials' })
  })

  it('rejects missing fields with 400', async () => {
    const res = await request(app).post('/api/auth/login').send({ id: 'carol' })

    expect(res.status).toBe(400)
  })
})

describe('GET /api/auth/me', () => {
  it('returns the id of the authenticated user', async () => {
    const agent = request.agent(app)
    await agent.post('/api/auth/signup').send({ id: 'erin', password: 'erins-password' })

    const res = await agent.get('/api/auth/me')

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ id: 'erin' })
  })

  it('returns 401 without a session cookie', async () => {
    const res = await request(app).get('/api/auth/me')

    expect(res.status).toBe(401)
  })

  it('keeps two different users sessions independent', async () => {
    const agentA = request.agent(app)
    await agentA.post('/api/auth/signup').send({ id: 'frank', password: 'franks-password' })

    const agentB = request.agent(app)
    await agentB.post('/api/auth/signup').send({ id: 'grace', password: 'graces-password' })

    const meA = await agentA.get('/api/auth/me')
    const meB = await agentB.get('/api/auth/me')

    expect(meA.body).toEqual({ id: 'frank' })
    expect(meB.body).toEqual({ id: 'grace' })
  })
})

describe('POST /api/auth/logout', () => {
  it('clears the session cookie so a subsequent /me is unauthenticated', async () => {
    const agent = request.agent(app)
    await agent.post('/api/auth/signup').send({ id: 'henry', password: 'henrys-password' })

    const logoutRes = await agent.post('/api/auth/logout')
    expect(logoutRes.status).toBe(200)

    const meRes = await agent.get('/api/auth/me')
    expect(meRes.status).toBe(401)
  })
})

describe('protected data routes', () => {
  it('returns 401 for an unauthenticated request to a protected route', async () => {
    const res = await request(app).get('/api/categories')

    expect(res.status).toBe(401)
  })

  it('GET /api/health stays public', async () => {
    const res = await request(app).get('/api/health')

    expect(res.status).toBe(200)
  })
})
