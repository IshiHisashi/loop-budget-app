import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import app from '../app.js'
import Category from '../models/Category.js'
import Expense from '../models/Expense.js'
import Subscription from '../models/Subscription.js'
import { getAuthenticatedAgent } from '../testUtils/authTestHelper.js'

let mongod: MongoMemoryServer
let agent: Awaited<ReturnType<typeof getAuthenticatedAgent>>['agent']
let userId: string

beforeAll(async () => {
  mongod = await MongoMemoryServer.create()
  await mongoose.connect(mongod.getUri())
  ;({ agent, userId } = await getAuthenticatedAgent(app))
})

afterEach(async () => {
  await Expense.deleteMany({})
  await Subscription.deleteMany({})
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
    const category = await Category.create({ userId, name: 'Groceries', isDefault: false })
    await Expense.create({ userId, date: '2026-01-05', amount: 10, category: category._id })
    await Expense.create({ userId, date: '2026-01-20', amount: 20, category: category._id })
    await Expense.create({ userId, date: '2026-01-10', amount: 30, category: category._id })
    await Expense.create({ userId, date: '2026-02-01', amount: 40, category: category._id })

    const res = await agent.get('/api/expenses?month=2026-01')

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(3)
    expect(res.body.map((expense: { amount: number }) => expense.amount)).toEqual([20, 30, 10])
  })

  it('returns an empty list for a month with no expenses', async () => {
    const category = await Category.create({ userId, name: 'Groceries', isDefault: false })
    await Expense.create({ userId, date: '2026-01-15', amount: 10, category: category._id })

    const res = await agent.get('/api/expenses?month=2026-02')

    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })

  it('does not return another account expenses for the same month', async () => {
    const other = await getAuthenticatedAgent(app)
    const theirCategory = await Category.create({
      userId: other.userId,
      name: 'Groceries',
      isDefault: false,
    })
    await Expense.create({
      userId: other.userId,
      date: '2026-01-15',
      amount: 999,
      category: theirCategory._id,
    })

    const res = await agent.get('/api/expenses?month=2026-01')

    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })
})

describe('GET /api/expenses — subscription-generated expenses', () => {
  it('generates an expense for an active subscription when its month is first viewed', async () => {
    const category = await Category.create({ userId, name: 'Streaming', isDefault: false })
    const subscription = await Subscription.create({
      userId,
      name: 'Netflix',
      amount: 9.99,
      category: category._id,
      dayOfMonth: 15,
      startMonth: '2026-01',
    })

    const res = await agent.get('/api/expenses?month=2026-01')

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0]).toMatchObject({
      amount: 9.99,
      category: category._id.toString(),
      subscription: subscription._id.toString(),
    })
    expect(new Date(res.body[0].date).toISOString()).toBe('2026-01-15T00:00:00.000Z')
  })

  it('does not generate anything for a month before startMonth or after endMonth', async () => {
    const category = await Category.create({ userId, name: 'Streaming', isDefault: false })
    await Subscription.create({
      userId,
      amount: 9.99,
      category: category._id,
      dayOfMonth: 15,
      startMonth: '2026-03',
      endMonth: '2026-05',
    })

    const beforeRes = await agent.get('/api/expenses?month=2026-02')
    expect(beforeRes.body).toEqual([])

    const afterRes = await agent.get('/api/expenses?month=2026-06')
    expect(afterRes.body).toEqual([])
  })

  it('generates for an open-ended subscription viewed far in the future', async () => {
    const category = await Category.create({ userId, name: 'Streaming', isDefault: false })
    await Subscription.create({
      userId,
      amount: 9.99,
      category: category._id,
      dayOfMonth: 15,
      startMonth: '2026-01',
    })

    const res = await agent.get('/api/expenses?month=2030-01')

    expect(res.body).toHaveLength(1)
  })

  it('clamps dayOfMonth 31 to the last real day when the viewed month is February', async () => {
    const category = await Category.create({ userId, name: 'Streaming', isDefault: false })
    await Subscription.create({
      userId,
      amount: 9.99,
      category: category._id,
      dayOfMonth: 31,
      startMonth: '2026-01',
    })

    const res = await agent.get('/api/expenses?month=2026-02')

    expect(res.body).toHaveLength(1)
    expect(new Date(res.body[0].date).toISOString()).toBe('2026-02-28T00:00:00.000Z')
  })

  it('clamps dayOfMonth 31 to the last real day when the viewed month is a 30-day month', async () => {
    const category = await Category.create({ userId, name: 'Streaming', isDefault: false })
    await Subscription.create({
      userId,
      amount: 9.99,
      category: category._id,
      dayOfMonth: 31,
      startMonth: '2026-01',
    })

    const res = await agent.get('/api/expenses?month=2026-09')

    expect(res.body).toHaveLength(1)
    expect(new Date(res.body[0].date).toISOString()).toBe('2026-09-30T00:00:00.000Z')
  })

  it('does not create a duplicate when the same month is fetched twice', async () => {
    const category = await Category.create({ userId, name: 'Streaming', isDefault: false })
    const subscription = await Subscription.create({
      userId,
      amount: 9.99,
      category: category._id,
      dayOfMonth: 15,
      startMonth: '2026-01',
    })

    await agent.get('/api/expenses?month=2026-01')
    await agent.get('/api/expenses?month=2026-01')

    const count = await Expense.countDocuments({ subscription: subscription._id })
    expect(count).toBe(1)
  })

  it('does not create a duplicate under concurrent requests for the same month', async () => {
    const category = await Category.create({ userId, name: 'Streaming', isDefault: false })
    const subscription = await Subscription.create({
      userId,
      amount: 9.99,
      category: category._id,
      dayOfMonth: 15,
      startMonth: '2026-01',
    })

    await Promise.all([
      agent.get('/api/expenses?month=2026-01'),
      agent.get('/api/expenses?month=2026-01'),
    ])

    const count = await Expense.countDocuments({ subscription: subscription._id })
    expect(count).toBe(1)
  })

  it('leaves an already-generated expense unchanged after the subscription is edited', async () => {
    const category = await Category.create({ userId, name: 'Streaming', isDefault: false })
    const subscription = await Subscription.create({
      userId,
      amount: 9.99,
      category: category._id,
      dayOfMonth: 15,
      startMonth: '2026-01',
    })

    await agent.get('/api/expenses?month=2026-01')
    await agent.patch(`/api/subscriptions/${subscription._id}`).send({ amount: 14.99 })

    const res = await agent.get('/api/expenses?month=2026-01')

    expect(res.body).toHaveLength(1)
    expect(res.body[0].amount).toBe(9.99)
  })

  it('does not create a second expense when dayOfMonth is edited after generation', async () => {
    const category = await Category.create({ userId, name: 'Streaming', isDefault: false })
    const subscription = await Subscription.create({
      userId,
      amount: 9.99,
      category: category._id,
      dayOfMonth: 15,
      startMonth: '2026-01',
    })

    await agent.get('/api/expenses?month=2026-01')
    await agent.patch(`/api/subscriptions/${subscription._id}`).send({ dayOfMonth: 20 })

    const res = await agent.get('/api/expenses?month=2026-01')

    expect(res.body).toHaveLength(1)
    expect(new Date(res.body[0].date).toISOString()).toBe('2026-01-15T00:00:00.000Z')
  })

  it('leaves an already-generated expense in place after the subscription is deleted, and generates nothing new for it', async () => {
    const category = await Category.create({ userId, name: 'Streaming', isDefault: false })
    const subscription = await Subscription.create({
      userId,
      amount: 9.99,
      category: category._id,
      dayOfMonth: 15,
      startMonth: '2026-01',
    })

    await agent.get('/api/expenses?month=2026-01')
    await agent.delete(`/api/subscriptions/${subscription._id}`)

    const janRes = await agent.get('/api/expenses?month=2026-01')
    expect(janRes.body).toHaveLength(1)

    const febRes = await agent.get('/api/expenses?month=2026-02')
    expect(febRes.body).toEqual([])
  })

  it('allows a generated expense to be edited and deleted like a normal expense', async () => {
    const category = await Category.create({ userId, name: 'Streaming', isDefault: false })
    await Subscription.create({
      userId,
      amount: 9.99,
      category: category._id,
      dayOfMonth: 15,
      startMonth: '2026-01',
    })
    const generated = (await agent.get('/api/expenses?month=2026-01')).body[0]

    const patchRes = await agent.patch(`/api/expenses/${generated._id}`).send({ amount: 12 })
    expect(patchRes.status).toBe(200)
    expect(patchRes.body.amount).toBe(12)

    const deleteRes = await agent.delete(`/api/expenses/${generated._id}`)
    expect(deleteRes.status).toBe(200)
    const found = await Expense.findById(generated._id)
    expect(found).toBeNull()
  })
})

describe('POST /api/expenses', () => {
  it('creates an expense', async () => {
    const category = await Category.create({ userId, name: 'Groceries', isDefault: false })

    const res = await agent
      .post('/api/expenses')
      .send({ date: '2026-01-15', amount: 42.5, category: category._id.toString(), note: 'Lunch' })

    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({ amount: 42.5, note: 'Lunch' })

    const count = await Expense.countDocuments()
    expect(count).toBe(1)
  })

  it('creates an expense without a note', async () => {
    const category = await Category.create({ userId, name: 'Groceries', isDefault: false })

    const res = await agent
      .post('/api/expenses')
      .send({ date: '2026-01-15', amount: 10, category: category._id.toString() })

    expect(res.status).toBe(201)
    expect(res.body.note).toBeUndefined()
  })

  it('rejects a missing date', async () => {
    const category = await Category.create({ userId, name: 'Groceries', isDefault: false })

    const res = await agent
      .post('/api/expenses')
      .send({ amount: 10, category: category._id.toString() })

    expect(res.status).toBe(400)
  })

  it('rejects an invalid date', async () => {
    const category = await Category.create({ userId, name: 'Groceries', isDefault: false })

    const res = await agent
      .post('/api/expenses')
      .send({ date: 'not-a-date', amount: 10, category: category._id.toString() })

    expect(res.status).toBe(400)
  })

  it('rejects a zero amount', async () => {
    const category = await Category.create({ userId, name: 'Groceries', isDefault: false })

    const res = await agent
      .post('/api/expenses')
      .send({ date: '2026-01-15', amount: 0, category: category._id.toString() })

    expect(res.status).toBe(400)
  })

  it('rejects a negative amount', async () => {
    const category = await Category.create({ userId, name: 'Groceries', isDefault: false })

    const res = await agent
      .post('/api/expenses')
      .send({ date: '2026-01-15', amount: -5, category: category._id.toString() })

    expect(res.status).toBe(400)
  })

  it('rejects a positive amount below the minimum with 400, not 500', async () => {
    const category = await Category.create({ userId, name: 'Groceries', isDefault: false })

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

  it('returns 404 when referencing another account category id', async () => {
    const other = await getAuthenticatedAgent(app)
    const theirCategory = await Category.create({
      userId: other.userId,
      name: 'Groceries',
      isDefault: false,
    })

    const res = await agent
      .post('/api/expenses')
      .send({ date: '2026-01-15', amount: 10, category: theirCategory._id.toString() })

    expect(res.status).toBe(404)
  })
})

describe('PATCH /api/expenses/:id', () => {
  it('partially updates an expense', async () => {
    const category = await Category.create({ userId, name: 'Groceries', isDefault: false })
    const expense = await Expense.create({
      userId,
      date: '2026-01-15',
      amount: 10,
      category: category._id,
    })

    const res = await agent.patch(`/api/expenses/${expense._id}`).send({ amount: 25 })

    expect(res.status).toBe(200)
    expect(res.body.amount).toBe(25)
    expect(new Date(res.body.date).toISOString()).toBe(expense.date.toISOString())
  })

  it('rejects an invalid amount', async () => {
    const category = await Category.create({ userId, name: 'Groceries', isDefault: false })
    const expense = await Expense.create({
      userId,
      date: '2026-01-15',
      amount: 10,
      category: category._id,
    })

    const res = await agent.patch(`/api/expenses/${expense._id}`).send({ amount: -1 })

    expect(res.status).toBe(400)
  })

  it('rejects a positive amount below the minimum with 400, not 500', async () => {
    const category = await Category.create({ userId, name: 'Groceries', isDefault: false })
    const expense = await Expense.create({
      userId,
      date: '2026-01-15',
      amount: 10,
      category: category._id,
    })

    const res = await agent.patch(`/api/expenses/${expense._id}`).send({ amount: 0.005 })

    expect(res.status).toBe(400)
  })

  it('returns 404 for an unknown id', async () => {
    const fakeId = new mongoose.Types.ObjectId()

    const res = await agent.patch(`/api/expenses/${fakeId}`).send({ amount: 10 })

    expect(res.status).toBe(404)
  })

  it('returns 404 for another account expense', async () => {
    const other = await getAuthenticatedAgent(app)
    const theirCategory = await Category.create({
      userId: other.userId,
      name: 'Groceries',
      isDefault: false,
    })
    const theirExpense = await Expense.create({
      userId: other.userId,
      date: '2026-01-15',
      amount: 10,
      category: theirCategory._id,
    })

    const res = await agent.patch(`/api/expenses/${theirExpense._id}`).send({ amount: 25 })

    expect(res.status).toBe(404)
  })

  it('returns 404 when changing category to one owned by another account', async () => {
    const category = await Category.create({ userId, name: 'Groceries', isDefault: false })
    const expense = await Expense.create({
      userId,
      date: '2026-01-15',
      amount: 10,
      category: category._id,
    })
    const other = await getAuthenticatedAgent(app)
    const theirCategory = await Category.create({
      userId: other.userId,
      name: 'Other',
      isDefault: false,
    })

    const res = await agent
      .patch(`/api/expenses/${expense._id}`)
      .send({ category: theirCategory._id.toString() })

    expect(res.status).toBe(404)
  })
})

describe('DELETE /api/expenses/:id', () => {
  it('deletes an expense', async () => {
    const category = await Category.create({ userId, name: 'Groceries', isDefault: false })
    const expense = await Expense.create({
      userId,
      date: '2026-01-15',
      amount: 10,
      category: category._id,
    })

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

  it('returns 404 for another account expense', async () => {
    const other = await getAuthenticatedAgent(app)
    const theirCategory = await Category.create({
      userId: other.userId,
      name: 'Groceries',
      isDefault: false,
    })
    const theirExpense = await Expense.create({
      userId: other.userId,
      date: '2026-01-15',
      amount: 10,
      category: theirCategory._id,
    })

    const res = await agent.delete(`/api/expenses/${theirExpense._id}`)

    expect(res.status).toBe(404)
    const stillThere = await Expense.findById(theirExpense._id)
    expect(stillThere).not.toBeNull()
  })
})
