import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import app from '../app.js'
import Budget from '../models/Budget.js'
import Category from '../models/Category.js'
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
  await Budget.deleteMany({})
  await Category.deleteMany({})
})

afterAll(async () => {
  await mongoose.disconnect()
  await mongod.stop()
})

describe('GET /api/budgets', () => {
  it('returns all budget entries for the authenticated account', async () => {
    const category = await Category.create({ userId, name: 'Groceries', isDefault: false })
    await Budget.create({ userId, category: category._id, amount: 300 })

    const res = await agent.get('/api/budgets')

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0]).toMatchObject({ amount: 300 })
  })

  it('does not return another account budget entries', async () => {
    const other = await getAuthenticatedAgent(app)
    const theirCategory = await Category.create({
      userId: other.userId,
      name: 'Groceries',
      isDefault: false,
    })
    await Budget.create({ userId: other.userId, category: theirCategory._id, amount: 999 })

    const res = await agent.get('/api/budgets')

    expect(res.body).toHaveLength(0)
  })
})

describe('PUT /api/budgets/:categoryId', () => {
  it('creates a new budget entry', async () => {
    const category = await Category.create({ userId, name: 'Groceries', isDefault: false })

    const res = await agent.put(`/api/budgets/${category._id}`).send({ amount: 300 })

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ amount: 300 })

    const count = await Budget.countDocuments({ category: category._id })
    expect(count).toBe(1)
  })

  it('upserts (updates in place) an existing budget entry', async () => {
    const category = await Category.create({ userId, name: 'Groceries', isDefault: false })
    await agent.put(`/api/budgets/${category._id}`).send({ amount: 300 })

    const res = await agent.put(`/api/budgets/${category._id}`).send({ amount: 450 })

    expect(res.status).toBe(200)
    expect(res.body.amount).toBe(450)

    const count = await Budget.countDocuments({ category: category._id })
    expect(count).toBe(1)
  })

  it('rejects a negative amount', async () => {
    const category = await Category.create({ userId, name: 'Groceries', isDefault: false })

    const res = await agent.put(`/api/budgets/${category._id}`).send({ amount: -10 })

    expect(res.status).toBe(400)
  })

  it('rejects a non-numeric amount', async () => {
    const category = await Category.create({ userId, name: 'Groceries', isDefault: false })

    const res = await agent.put(`/api/budgets/${category._id}`).send({ amount: 'lots' })

    expect(res.status).toBe(400)
  })

  it('rejects a missing amount', async () => {
    const category = await Category.create({ userId, name: 'Groceries', isDefault: false })

    const res = await agent.put(`/api/budgets/${category._id}`).send({})

    expect(res.status).toBe(400)
  })

  it('returns 400 for a malformed categoryId', async () => {
    const res = await agent.put('/api/budgets/not-an-id').send({ amount: 100 })

    expect(res.status).toBe(400)
  })

  it('returns 404 for a well-formed but non-existent categoryId', async () => {
    const fakeId = new mongoose.Types.ObjectId()

    const res = await agent.put(`/api/budgets/${fakeId}`).send({ amount: 100 })

    expect(res.status).toBe(404)
  })

  it('returns 404 for another account category', async () => {
    const other = await getAuthenticatedAgent(app)
    const theirCategory = await Category.create({
      userId: other.userId,
      name: 'Groceries',
      isDefault: false,
    })

    const res = await agent.put(`/api/budgets/${theirCategory._id}`).send({ amount: 100 })

    expect(res.status).toBe(404)
    const count = await Budget.countDocuments({ category: theirCategory._id })
    expect(count).toBe(0)
  })
})

describe('DELETE /api/budgets/:categoryId', () => {
  it('removes a budget entry', async () => {
    const category = await Category.create({ userId, name: 'Groceries', isDefault: false })
    await Budget.create({ userId, category: category._id, amount: 300 })

    const res = await agent.delete(`/api/budgets/${category._id}`)

    expect(res.status).toBe(200)
    const found = await Budget.findOne({ category: category._id })
    expect(found).toBeNull()
  })

  it('returns 404 when no budget entry exists for the category', async () => {
    const category = await Category.create({ userId, name: 'Groceries', isDefault: false })

    const res = await agent.delete(`/api/budgets/${category._id}`)

    expect(res.status).toBe(404)
  })

  it('returns 404 for another account budget entry', async () => {
    const other = await getAuthenticatedAgent(app)
    const theirCategory = await Category.create({
      userId: other.userId,
      name: 'Groceries',
      isDefault: false,
    })
    await Budget.create({ userId: other.userId, category: theirCategory._id, amount: 300 })

    const res = await agent.delete(`/api/budgets/${theirCategory._id}`)

    expect(res.status).toBe(404)
    const stillThere = await Budget.findOne({ category: theirCategory._id })
    expect(stillThere).not.toBeNull()
  })
})
