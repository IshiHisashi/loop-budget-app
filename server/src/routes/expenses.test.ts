import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import app from '../app.js'
import Category from '../models/Category.js'
import Expense from '../models/Expense.js'
import { getAuthenticatedAgent } from '../testUtils/authTestHelper.js'

let mongod: MongoMemoryServer
let agent: Awaited<ReturnType<typeof getAuthenticatedAgent>>

beforeAll(async () => {
  mongod = await MongoMemoryServer.create()
  await mongoose.connect(mongod.getUri())
  agent = await getAuthenticatedAgent(app)
})

afterEach(async () => {
  await Expense.deleteMany({})
  await Category.deleteMany({})
})

afterAll(async () => {
  await mongoose.disconnect()
  await mongod.stop()
})

describe('GET /api/expenses', () => {
  it('rejects a missing month', async () => {
    const res = await agent.get('/api/expenses')

    expect(res.status).toBe(400)
  })

  it('rejects a malformed month', async () => {
    const res = await agent.get('/api/expenses?month=2026-13')

    expect(res.status).toBe(400)
  })

  it('rejects a non-YYYY-MM month string', async () => {
    const res = await agent.get('/api/expenses?month=January')

    expect(res.status).toBe(400)
  })

  it('returns expenses within the given month, sorted most-recent-date-first', async () => {
    const category = await Category.create({ name: 'Food', isDefault: false })
    await Expense.create({ date: '2026-01-05', amount: 10, category: category._id })
    await Expense.create({ date: '2026-01-20', amount: 20, category: category._id })
    await Expense.create({ date: '2026-01-10', amount: 30, category: category._id })
    await Expense.create({ date: '2026-02-01', amount: 40, category: category._id })

    const res = await agent.get('/api/expenses?month=2026-01')

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(3)
    expect(res.body.map((expense: { amount: number }) => expense.amount)).toEqual([20, 30, 10])
  })

  it('returns an empty list for a month with no expenses', async () => {
    const category = await Category.create({ name: 'Food', isDefault: false })
    await Expense.create({ date: '2026-01-15', amount: 10, category: category._id })

    const res = await agent.get('/api/expenses?month=2026-02')

    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })
})

describe('POST /api/expenses', () => {
  it('creates an expense', async () => {
    const category = await Category.create({ name: 'Food', isDefault: false })

    const res = await agent
      .post('/api/expenses')
      .send({ date: '2026-01-15', amount: 42.5, category: category._id.toString(), note: 'Lunch' })

    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({ amount: 42.5, note: 'Lunch' })

    const count = await Expense.countDocuments()
    expect(count).toBe(1)
  })

  it('creates an expense without a note', async () => {
    const category = await Category.create({ name: 'Food', isDefault: false })

    const res = await agent
      .post('/api/expenses')
      .send({ date: '2026-01-15', amount: 10, category: category._id.toString() })

    expect(res.status).toBe(201)
    expect(res.body.note).toBeUndefined()
  })

  it('rejects a missing date', async () => {
    const category = await Category.create({ name: 'Food', isDefault: false })

    const res = await agent
      .post('/api/expenses')
      .send({ amount: 10, category: category._id.toString() })

    expect(res.status).toBe(400)
  })

  it('rejects an invalid date', async () => {
    const category = await Category.create({ name: 'Food', isDefault: false })

    const res = await agent
      .post('/api/expenses')
      .send({ date: 'not-a-date', amount: 10, category: category._id.toString() })

    expect(res.status).toBe(400)
  })

  it('rejects a zero amount', async () => {
    const category = await Category.create({ name: 'Food', isDefault: false })

    const res = await agent
      .post('/api/expenses')
      .send({ date: '2026-01-15', amount: 0, category: category._id.toString() })

    expect(res.status).toBe(400)
  })

  it('rejects a negative amount', async () => {
    const category = await Category.create({ name: 'Food', isDefault: false })

    const res = await agent
      .post('/api/expenses')
      .send({ date: '2026-01-15', amount: -5, category: category._id.toString() })

    expect(res.status).toBe(400)
  })

  it('rejects a positive amount below the minimum with 400, not 500', async () => {
    const category = await Category.create({ name: 'Food', isDefault: false })

    const res = await agent
      .post('/api/expenses')
      .send({ date: '2026-01-15', amount: 0.005, category: category._id.toString() })

    expect(res.status).toBe(400)
  })

  it('rejects a malformed category id', async () => {
    const res = await agent
      .post('/api/expenses')
      .send({ date: '2026-01-15', amount: 10, category: 'not-an-id' })

    expect(res.status).toBe(400)
  })

  it('returns 404 for a well-formed but non-existent category id', async () => {
    const fakeId = new mongoose.Types.ObjectId()

    const res = await agent
      .post('/api/expenses')
      .send({ date: '2026-01-15', amount: 10, category: fakeId.toString() })

    expect(res.status).toBe(404)
  })
})

describe('PATCH /api/expenses/:id', () => {
  it('partially updates an expense', async () => {
    const category = await Category.create({ name: 'Food', isDefault: false })
    const expense = await Expense.create({ date: '2026-01-15', amount: 10, category: category._id })

    const res = await agent
      .patch(`/api/expenses/${expense._id}`)
      .send({ amount: 25 })

    expect(res.status).toBe(200)
    expect(res.body.amount).toBe(25)
    expect(new Date(res.body.date).toISOString()).toBe(expense.date.toISOString())
  })

  it('rejects an invalid amount', async () => {
    const category = await Category.create({ name: 'Food', isDefault: false })
    const expense = await Expense.create({ date: '2026-01-15', amount: 10, category: category._id })

    const res = await agent
      .patch(`/api/expenses/${expense._id}`)
      .send({ amount: -1 })

    expect(res.status).toBe(400)
  })

  it('rejects a positive amount below the minimum with 400, not 500', async () => {
    const category = await Category.create({ name: 'Food', isDefault: false })
    const expense = await Expense.create({ date: '2026-01-15', amount: 10, category: category._id })

    const res = await agent
      .patch(`/api/expenses/${expense._id}`)
      .send({ amount: 0.005 })

    expect(res.status).toBe(400)
  })

  it('returns 404 for an unknown id', async () => {
    const fakeId = new mongoose.Types.ObjectId()

    const res = await agent.patch(`/api/expenses/${fakeId}`).send({ amount: 10 })

    expect(res.status).toBe(404)
  })
})

describe('DELETE /api/expenses/:id', () => {
  it('deletes an expense', async () => {
    const category = await Category.create({ name: 'Food', isDefault: false })
    const expense = await Expense.create({ date: '2026-01-15', amount: 10, category: category._id })

    const res = await agent.delete(`/api/expenses/${expense._id}`)

    expect(res.status).toBe(200)
    const found = await Expense.findById(expense._id)
    expect(found).toBeNull()
  })

  it('returns 404 for an unknown id', async () => {
    const fakeId = new mongoose.Types.ObjectId()

    const res = await agent.delete(`/api/expenses/${fakeId}`)

    expect(res.status).toBe(404)
  })
})
