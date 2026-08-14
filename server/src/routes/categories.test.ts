import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import app from '../app.js'
import Budget from '../models/Budget.js'
import Category from '../models/Category.js'
import Expense from '../models/Expense.js'
import { DEFAULT_CATEGORY_NAMES, seedDefaultCategoriesForUser } from '../seed/categories.js'
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
  await Expense.deleteMany({})
  await Category.deleteMany({})
})

afterAll(async () => {
  await mongoose.disconnect()
  await mongod.stop()
})

describe('GET /api/categories', () => {
  it('returns the seeded predefined categories', async () => {
    // Signup (beforeAll) already seeded these — this is the first test
    // in the file, so afterEach hasn't wiped them yet.
    const res = await agent.get('/api/categories')

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(DEFAULT_CATEGORY_NAMES.length)
    expect(res.body.every((c: { isDefault: boolean }) => c.isDefault === true)).toBe(true)
  })

  it('does not return another account categories', async () => {
    await Category.create({ userId, name: 'Gifts', isDefault: false })
    const other = await getAuthenticatedAgent(app)
    await Category.create({ userId: other.userId, name: 'Other Account Only', isDefault: false })

    const res = await agent.get('/api/categories')

    expect(res.body.some((c: { name: string }) => c.name === 'Gifts')).toBe(true)
    expect(res.body.some((c: { name: string }) => c.name === 'Other Account Only')).toBe(false)
  })
})

describe('POST /api/categories', () => {
  it('creates a custom category', async () => {
    const res = await agent.post('/api/categories').send({ name: 'Gifts' })

    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({ name: 'Gifts', isDefault: false })
  })

  it('rejects a blank name', async () => {
    const res = await agent.post('/api/categories').send({ name: '   ' })

    expect(res.status).toBe(400)
  })

  it('rejects a case-insensitive duplicate name', async () => {
    await seedDefaultCategoriesForUser(userId)

    const res = await agent.post('/api/categories').send({ name: 'food' })

    expect(res.status).toBe(409)
  })

  it('allows the same name for a different account', async () => {
    await agent.post('/api/categories').send({ name: 'Gifts' })
    const other = await getAuthenticatedAgent(app)

    const res = await other.agent.post('/api/categories').send({ name: 'Gifts' })

    expect(res.status).toBe(201)
  })
})

describe('PATCH /api/categories/:id', () => {
  it('renames a custom category', async () => {
    const created = await Category.create({ userId, name: 'Gifts', isDefault: false })

    const res = await agent.patch(`/api/categories/${created._id}`).send({ name: 'Presents' })

    expect(res.status).toBe(200)
    expect(res.body.name).toBe('Presents')
  })

  it('rejects modifying a predefined category', async () => {
    await seedDefaultCategoriesForUser(userId)
    const food = await Category.findOne({ userId, name: 'Food' })

    const res = await agent.patch(`/api/categories/${food!._id}`).send({ name: 'Snacks' })

    expect(res.status).toBe(403)
  })

  it('returns 404 for an unknown id', async () => {
    const fakeId = new mongoose.Types.ObjectId()

    const res = await agent.patch(`/api/categories/${fakeId}`).send({ name: 'Whatever' })

    expect(res.status).toBe(404)
  })

  it('returns 404 for another account category', async () => {
    const other = await getAuthenticatedAgent(app)
    const theirs = await Category.create({
      userId: other.userId,
      name: 'Theirs',
      isDefault: false,
    })

    const res = await agent.patch(`/api/categories/${theirs._id}`).send({ name: 'Mine now' })

    expect(res.status).toBe(404)
  })

  it('rejects a case-insensitive duplicate name', async () => {
    await seedDefaultCategoriesForUser(userId)
    const gifts = await Category.create({ userId, name: 'Gifts', isDefault: false })

    const res = await agent.patch(`/api/categories/${gifts._id}`).send({ name: 'food' })

    expect(res.status).toBe(409)
  })
})

describe('DELETE /api/categories/:id', () => {
  it('deletes a custom category', async () => {
    const created = await Category.create({ userId, name: 'Gifts', isDefault: false })

    const res = await agent.delete(`/api/categories/${created._id}`)

    expect(res.status).toBe(200)
    const found = await Category.findById(created._id)
    expect(found).toBeNull()
  })

  it('rejects deleting a predefined category', async () => {
    await seedDefaultCategoriesForUser(userId)
    const food = await Category.findOne({ userId, name: 'Food' })

    const res = await agent.delete(`/api/categories/${food!._id}`)

    expect(res.status).toBe(403)
  })

  it('returns 404 for an unknown id', async () => {
    const fakeId = new mongoose.Types.ObjectId()

    const res = await agent.delete(`/api/categories/${fakeId}`)

    expect(res.status).toBe(404)
  })

  it('returns 404 for another account category', async () => {
    const other = await getAuthenticatedAgent(app)
    const theirs = await Category.create({
      userId: other.userId,
      name: 'Theirs',
      isDefault: false,
    })

    const res = await agent.delete(`/api/categories/${theirs._id}`)

    expect(res.status).toBe(404)
    const stillThere = await Category.findById(theirs._id)
    expect(stillThere).not.toBeNull()
  })

  it('rejects deleting a category that has a budget entry', async () => {
    const created = await Category.create({ userId, name: 'Gifts', isDefault: false })
    await Budget.create({ userId, category: created._id, amount: 100 })

    const res = await agent.delete(`/api/categories/${created._id}`)

    expect(res.status).toBe(409)
    const stillThere = await Category.findById(created._id)
    expect(stillThere).not.toBeNull()
  })

  it('rejects deleting a category that has an expense entry', async () => {
    const created = await Category.create({ userId, name: 'Gifts', isDefault: false })
    await Expense.create({ userId, date: '2026-01-15', amount: 10, category: created._id })

    const res = await agent.delete(`/api/categories/${created._id}`)

    expect(res.status).toBe(409)
    const stillThere = await Category.findById(created._id)
    expect(stillThere).not.toBeNull()
  })
})
