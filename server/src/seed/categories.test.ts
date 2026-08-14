import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import Category from '../models/Category.js'
import { DEFAULT_CATEGORY_NAMES, seedDefaultCategoriesForUser } from './categories.js'

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

describe('seedDefaultCategoriesForUser', () => {
  it('seeds the predefined categories for the given user', async () => {
    const userId = new mongoose.Types.ObjectId()

    await seedDefaultCategoriesForUser(userId)

    const categories = await Category.find({ userId })
    expect(categories).toHaveLength(DEFAULT_CATEGORY_NAMES.length)
    expect(categories.every((c) => c.isDefault === true)).toBe(true)
    expect(categories.map((c) => c.name).sort()).toEqual([...DEFAULT_CATEGORY_NAMES].sort())
  })

  it('is idempotent: does not duplicate on a second call for the same user', async () => {
    const userId = new mongoose.Types.ObjectId()

    await seedDefaultCategoriesForUser(userId)
    await seedDefaultCategoriesForUser(userId)

    const count = await Category.countDocuments({ userId })
    expect(count).toBe(DEFAULT_CATEGORY_NAMES.length)
  })

  it('seeds independent defaults for a second, different user', async () => {
    const userIdA = new mongoose.Types.ObjectId()
    const userIdB = new mongoose.Types.ObjectId()

    await seedDefaultCategoriesForUser(userIdA)
    await seedDefaultCategoriesForUser(userIdB)

    const countA = await Category.countDocuments({ userId: userIdA })
    const countB = await Category.countDocuments({ userId: userIdB })
    expect(countA).toBe(DEFAULT_CATEGORY_NAMES.length)
    expect(countB).toBe(DEFAULT_CATEGORY_NAMES.length)
  })
})
