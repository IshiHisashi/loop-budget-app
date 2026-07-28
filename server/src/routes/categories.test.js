import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import request from 'supertest'
import app from '../app.js'
import Category from '../models/Category.js'
import { DEFAULT_CATEGORY_NAMES, seedDefaultCategories } from '../seed/categories.js'

let mongod

beforeAll(async () => {
  mongod = await MongoMemoryServer.create()
  await mongoose.connect(mongod.getUri())
})

afterEach(async () => {
  await Category.deleteMany({})
})

afterAll(async () => {
  await mongoose.disconnect()
  await mongod.stop()
})

describe('GET /api/categories', () => {
  it('returns the seeded predefined categories', async () => {
    await seedDefaultCategories()

    const res = await request(app).get('/api/categories')

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(DEFAULT_CATEGORY_NAMES.length)
    expect(res.body.every((c) => c.isDefault === true)).toBe(true)
  })
})

describe('POST /api/categories', () => {
  it('creates a custom category', async () => {
    const res = await request(app).post('/api/categories').send({ name: 'Gifts' })

    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({ name: 'Gifts', isDefault: false })
  })

  it('rejects a blank name', async () => {
    const res = await request(app).post('/api/categories').send({ name: '   ' })

    expect(res.status).toBe(400)
  })

  it('rejects a case-insensitive duplicate name', async () => {
    await seedDefaultCategories()

    const res = await request(app).post('/api/categories').send({ name: 'food' })

    expect(res.status).toBe(409)
  })
})

describe('PATCH /api/categories/:id', () => {
  it('renames a custom category', async () => {
    const created = await Category.create({ name: 'Gifts', isDefault: false })

    const res = await request(app)
      .patch(`/api/categories/${created._id}`)
      .send({ name: 'Presents' })

    expect(res.status).toBe(200)
    expect(res.body.name).toBe('Presents')
  })

  it('rejects modifying a predefined category', async () => {
    await seedDefaultCategories()
    const food = await Category.findOne({ name: 'Food' })

    const res = await request(app)
      .patch(`/api/categories/${food._id}`)
      .send({ name: 'Snacks' })

    expect(res.status).toBe(403)
  })

  it('returns 404 for an unknown id', async () => {
    const fakeId = new mongoose.Types.ObjectId()

    const res = await request(app)
      .patch(`/api/categories/${fakeId}`)
      .send({ name: 'Whatever' })

    expect(res.status).toBe(404)
  })

  it('rejects a case-insensitive duplicate name', async () => {
    await seedDefaultCategories()
    const gifts = await Category.create({ name: 'Gifts', isDefault: false })

    const res = await request(app)
      .patch(`/api/categories/${gifts._id}`)
      .send({ name: 'food' })

    expect(res.status).toBe(409)
  })
})

describe('DELETE /api/categories/:id', () => {
  it('deletes a custom category', async () => {
    const created = await Category.create({ name: 'Gifts', isDefault: false })

    const res = await request(app).delete(`/api/categories/${created._id}`)

    expect(res.status).toBe(200)
    const found = await Category.findById(created._id)
    expect(found).toBeNull()
  })

  it('rejects deleting a predefined category', async () => {
    await seedDefaultCategories()
    const food = await Category.findOne({ name: 'Food' })

    const res = await request(app).delete(`/api/categories/${food._id}`)

    expect(res.status).toBe(403)
  })

  it('returns 404 for an unknown id', async () => {
    const fakeId = new mongoose.Types.ObjectId()

    const res = await request(app).delete(`/api/categories/${fakeId}`)

    expect(res.status).toBe(404)
  })
})
