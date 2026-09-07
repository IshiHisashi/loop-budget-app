import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import app from '../app.js'
import Category from '../models/Category.js'
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
  await Subscription.deleteMany({})
  await Category.deleteMany({})
})

afterAll(async () => {
  await mongoose.disconnect()
  await mongod.stop()
})

async function createCategory(name = 'Streaming'): Promise<string> {
  const category = await Category.create({ userId, name, isDefault: false })
  return category._id.toString()
}

function validPayload(categoryId: string): Record<string, unknown> {
  return {
    name: 'Netflix',
    amount: 15.99,
    category: categoryId,
    dayOfMonth: 15,
    startMonth: '2026-01',
  }
}

describe('GET /api/subscriptions', () => {
  it('returns an empty list when none exist', async () => {
    const res = await agent.get('/api/subscriptions')

    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })

  it('does not return another account subscriptions', async () => {
    const categoryId = await createCategory()
    await Subscription.create({ userId, ...validPayload(categoryId) })

    const other = await getAuthenticatedAgent(app)
    const otherCategoryId = await Category.create({
      userId: other.userId,
      name: 'Gym',
      isDefault: false,
    }).then((c) => c._id.toString())
    await Subscription.create({ userId: other.userId, ...validPayload(otherCategoryId) })

    const res = await agent.get('/api/subscriptions')

    expect(res.body).toHaveLength(1)
    expect(res.body[0].name).toBe('Netflix')
  })
})

describe('POST /api/subscriptions', () => {
  it('creates a subscription with all fields', async () => {
    const categoryId = await createCategory()

    const res = await agent
      .post('/api/subscriptions')
      .send({ ...validPayload(categoryId), endMonth: '2026-12' })

    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({
      name: 'Netflix',
      amount: 15.99,
      category: categoryId,
      dayOfMonth: 15,
      startMonth: '2026-01',
      endMonth: '2026-12',
    })
  })

  it('creates an open-ended subscription when endMonth is omitted', async () => {
    const categoryId = await createCategory()

    const res = await agent.post('/api/subscriptions').send(validPayload(categoryId))

    expect(res.status).toBe(201)
    expect(res.body.endMonth).toBeUndefined()
  })

  it('rejects an amount below the minimum', async () => {
    const categoryId = await createCategory()

    const res = await agent
      .post('/api/subscriptions')
      .send({ ...validPayload(categoryId), amount: 0 })

    expect(res.status).toBe(400)
  })

  it('rejects a malformed category id', async () => {
    const res = await agent
      .post('/api/subscriptions')
      .send({ ...validPayload('not-an-id'), category: 'not-an-id' })

    expect(res.status).toBe(400)
  })

  it('rejects a category that does not belong to the account', async () => {
    const other = await getAuthenticatedAgent(app)
    const theirCategoryId = await Category.create({
      userId: other.userId,
      name: 'Theirs',
      isDefault: false,
    }).then((c) => c._id.toString())

    const res = await agent.post('/api/subscriptions').send(validPayload(theirCategoryId))

    expect(res.status).toBe(404)
  })

  it.each([0, 32, 2.5])('rejects an invalid dayOfMonth of %s', async (dayOfMonth) => {
    const categoryId = await createCategory()

    const res = await agent
      .post('/api/subscriptions')
      .send({ ...validPayload(categoryId), dayOfMonth })

    expect(res.status).toBe(400)
  })

  it('rejects a malformed startMonth', async () => {
    const categoryId = await createCategory()

    const res = await agent
      .post('/api/subscriptions')
      .send({ ...validPayload(categoryId), startMonth: '2026-13' })

    expect(res.status).toBe(400)
  })

  it('rejects a malformed endMonth', async () => {
    const categoryId = await createCategory()

    const res = await agent
      .post('/api/subscriptions')
      .send({ ...validPayload(categoryId), endMonth: 'not-a-month' })

    expect(res.status).toBe(400)
  })

  it('rejects an endMonth before startMonth', async () => {
    const categoryId = await createCategory()

    const res = await agent
      .post('/api/subscriptions')
      .send({ ...validPayload(categoryId), startMonth: '2026-06', endMonth: '2026-01' })

    expect(res.status).toBe(400)
  })

  it('rejects a non-string name', async () => {
    const categoryId = await createCategory()

    const res = await agent
      .post('/api/subscriptions')
      .send({ ...validPayload(categoryId), name: 42 })

    expect(res.status).toBe(400)
  })
})

describe('PATCH /api/subscriptions/:id', () => {
  it('updates a single field, leaving the rest unchanged', async () => {
    const categoryId = await createCategory()
    const created = await Subscription.create({ userId, ...validPayload(categoryId) })

    const res = await agent.patch(`/api/subscriptions/${created._id}`).send({ amount: 20 })

    expect(res.status).toBe(200)
    expect(res.body.amount).toBe(20)
    expect(res.body.name).toBe('Netflix')
    expect(res.body.dayOfMonth).toBe(15)
  })

  it('updates the category, re-validating ownership', async () => {
    const categoryId = await createCategory()
    const newCategoryId = await createCategory('Music')
    const created = await Subscription.create({ userId, ...validPayload(categoryId) })

    const res = await agent
      .patch(`/api/subscriptions/${created._id}`)
      .send({ category: newCategoryId })

    expect(res.status).toBe(200)
    expect(res.body.category).toBe(newCategoryId)
  })

  it('rejects a category update to a category not owned by the account', async () => {
    const categoryId = await createCategory()
    const created = await Subscription.create({ userId, ...validPayload(categoryId) })

    const other = await getAuthenticatedAgent(app)
    const theirCategoryId = await Category.create({
      userId: other.userId,
      name: 'Theirs',
      isDefault: false,
    }).then((c) => c._id.toString())

    const res = await agent
      .patch(`/api/subscriptions/${created._id}`)
      .send({ category: theirCategoryId })

    expect(res.status).toBe(404)
  })

  it('sets and then clears endMonth via null', async () => {
    const categoryId = await createCategory()
    const created = await Subscription.create({ userId, ...validPayload(categoryId) })

    const setRes = await agent
      .patch(`/api/subscriptions/${created._id}`)
      .send({ endMonth: '2026-12' })
    expect(setRes.status).toBe(200)
    expect(setRes.body.endMonth).toBe('2026-12')

    const clearRes = await agent
      .patch(`/api/subscriptions/${created._id}`)
      .send({ endMonth: null })
    expect(clearRes.status).toBe(200)
    expect(clearRes.body.endMonth).toBeUndefined()
  })

  it('rejects an update whose resulting endMonth precedes its resulting startMonth', async () => {
    const categoryId = await createCategory()
    const created = await Subscription.create({
      userId,
      ...validPayload(categoryId),
      startMonth: '2026-03',
      endMonth: '2026-06',
    })

    const res = await agent
      .patch(`/api/subscriptions/${created._id}`)
      .send({ startMonth: '2026-07' })

    expect(res.status).toBe(400)
    const stillThere = await Subscription.findById(created._id)
    expect(stillThere!.startMonth).toBe('2026-03')
  })

  it('returns 404 for an unknown id', async () => {
    const fakeId = new mongoose.Types.ObjectId()

    const res = await agent.patch(`/api/subscriptions/${fakeId}`).send({ amount: 10 })

    expect(res.status).toBe(404)
  })

  it('returns 404 for another account subscription', async () => {
    const other = await getAuthenticatedAgent(app)
    const theirCategoryId = await Category.create({
      userId: other.userId,
      name: 'Theirs',
      isDefault: false,
    }).then((c) => c._id.toString())
    const theirs = await Subscription.create({
      userId: other.userId,
      ...validPayload(theirCategoryId),
    })

    const res = await agent.patch(`/api/subscriptions/${theirs._id}`).send({ amount: 10 })

    expect(res.status).toBe(404)
  })
})

describe('DELETE /api/subscriptions/:id', () => {
  it('deletes a subscription', async () => {
    const categoryId = await createCategory()
    const created = await Subscription.create({ userId, ...validPayload(categoryId) })

    const res = await agent.delete(`/api/subscriptions/${created._id}`)

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ deleted: true })
    const found = await Subscription.findById(created._id)
    expect(found).toBeNull()
  })

  it('returns 404 for an unknown id', async () => {
    const fakeId = new mongoose.Types.ObjectId()

    const res = await agent.delete(`/api/subscriptions/${fakeId}`)

    expect(res.status).toBe(404)
  })

  it('returns 404 for another account subscription', async () => {
    const other = await getAuthenticatedAgent(app)
    const theirCategoryId = await Category.create({
      userId: other.userId,
      name: 'Theirs',
      isDefault: false,
    }).then((c) => c._id.toString())
    const theirs = await Subscription.create({
      userId: other.userId,
      ...validPayload(theirCategoryId),
    })

    const res = await agent.delete(`/api/subscriptions/${theirs._id}`)

    expect(res.status).toBe(404)
    const stillThere = await Subscription.findById(theirs._id)
    expect(stillThere).not.toBeNull()
  })
})
