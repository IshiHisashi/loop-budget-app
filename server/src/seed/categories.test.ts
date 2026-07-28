import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import Category from '../models/Category.js'
import { DEFAULT_CATEGORY_NAMES, seedDefaultCategories } from './categories.js'

let mongod: MongoMemoryServer

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

describe('seedDefaultCategories', () => {
  it('seeds the predefined categories into an empty collection', async () => {
    await seedDefaultCategories()

    const categories = await Category.find()
    expect(categories).toHaveLength(DEFAULT_CATEGORY_NAMES.length)
    expect(categories.every((c) => c.isDefault === true)).toBe(true)
    expect(categories.map((c) => c.name).sort()).toEqual(
      [...DEFAULT_CATEGORY_NAMES].sort()
    )
  })

  it('is idempotent: does not duplicate on a second call', async () => {
    await seedDefaultCategories()
    await seedDefaultCategories()

    const count = await Category.countDocuments()
    expect(count).toBe(DEFAULT_CATEGORY_NAMES.length)
  })
})
