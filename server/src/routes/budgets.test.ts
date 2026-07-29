import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import request from 'supertest'
import app from '../app.js'
import Budget from '../models/Budget.js'
import Category from '../models/Category.js'

let mongod: MongoMemoryServer

beforeAll(async () => {
  mongod = await MongoMemoryServer.create()
  await mongoose.connect(mongod.getUri())
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
  it('returns all budget entries', async () => {
    const category = await Category.create({ name: 'Food', isDefault: false })
    await Budget.create({ category: category._id, amount: 300 })

    const res = await request(app).get('/api/budgets')

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0]).toMatchObject({ amount: 300 })
  })
})

describe('PUT /api/budgets/:categoryId', () => {
  it('creates a new budget entry', async () => {
    const category = await Category.create({ name: 'Food', isDefault: false })

    const res = await request(app)
      .put(`/api/budgets/${category._id}`)
      .send({ amount: 300 })

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ amount: 300 })

    const count = await Budget.countDocuments({ category: category._id })
    expect(count).toBe(1)
  })

  it('upserts (updates in place) an existing budget entry', async () => {
    const category = await Category.create({ name: 'Food', isDefault: false })
    await request(app).put(`/api/budgets/${category._id}`).send({ amount: 300 })

    const res = await request(app)
      .put(`/api/budgets/${category._id}`)
      .send({ amount: 450 })

    expect(res.status).toBe(200)
    expect(res.body.amount).toBe(450)

    const count = await Budget.countDocuments({ category: category._id })
    expect(count).toBe(1)
  })

  it('rejects a negative amount', async () => {
    const category = await Category.create({ name: 'Food', isDefault: false })

    const res = await request(app)
      .put(`/api/budgets/${category._id}`)
      .send({ amount: -10 })

    expect(res.status).toBe(400)
  })

  it('rejects a non-numeric amount', async () => {
    const category = await Category.create({ name: 'Food', isDefault: false })

    const res = await request(app)
      .put(`/api/budgets/${category._id}`)
      .send({ amount: 'lots' })

    expect(res.status).toBe(400)
  })

  it('rejects a missing amount', async () => {
    const category = await Category.create({ name: 'Food', isDefault: false })

    const res = await request(app).put(`/api/budgets/${category._id}`).send({})

    expect(res.status).toBe(400)
  })

  it('returns 400 for a malformed categoryId', async () => {
    const res = await request(app).put('/api/budgets/not-an-id').send({ amount: 100 })

    expect(res.status).toBe(400)
  })

  it('returns 404 for a well-formed but non-existent categoryId', async () => {
    const fakeId = new mongoose.Types.ObjectId()

    const res = await request(app)
      .put(`/api/budgets/${fakeId}`)
      .send({ amount: 100 })

    expect(res.status).toBe(404)
  })
})

describe('DELETE /api/budgets/:categoryId', () => {
  it('removes a budget entry', async () => {
    const category = await Category.create({ name: 'Food', isDefault: false })
    await Budget.create({ category: category._id, amount: 300 })

    const res = await request(app).delete(`/api/budgets/${category._id}`)

    expect(res.status).toBe(200)
    const found = await Budget.findOne({ category: category._id })
    expect(found).toBeNull()
  })

  it('returns 404 when no budget entry exists for the category', async () => {
    const category = await Category.create({ name: 'Food', isDefault: false })

    const res = await request(app).delete(`/api/budgets/${category._id}`)

    expect(res.status).toBe(404)
  })
})
