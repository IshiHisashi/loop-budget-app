import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import Category from '../models/Category.js'
import User from '../models/User.js'
import { backfillOthersCategory } from './backfillOthersCategory.js'

let mongod: MongoMemoryServer

beforeAll(async () => {
  mongod = await MongoMemoryServer.create()
  await mongoose.connect(mongod.getUri())
})

afterEach(async () => {
  await Category.deleteMany({})
  await User.deleteMany({})
})

afterAll(async () => {
  await mongoose.disconnect()
  await mongod.stop()
})

async function createUser(username: string) {
  return User.create({ username, passwordHash: 'irrelevant-for-this-test' })
}

describe('backfillOthersCategory', () => {
  it('creates an "Others" category for a user with no categories at all', async () => {
    const user = await createUser('alice')

    const result = await backfillOthersCategory()

    expect(result).toEqual({ usersProcessed: 1, created: 1, skipped: [] })
    const others = await Category.findOne({ userId: user._id, name: 'Others' })
    expect(others).not.toBeNull()
    expect(others!.isDefault).toBe(true)
  })

  it('skips a user who already has a category named "Others" in some other casing', async () => {
    const user = await createUser('bob')
    await Category.create({ userId: user._id, name: 'others', isDefault: false })

    const result = await backfillOthersCategory()

    expect(result.created).toBe(0)
    expect(result.skipped).toEqual([
      { userId: user._id.toString(), reason: 'already has an "Others" category' },
    ])
    const count = await Category.countDocuments({
      userId: user._id,
      name: { $regex: '^others$', $options: 'i' },
    })
    expect(count).toBe(1)
  })

  it('is idempotent: running it twice creates nothing new on the second run', async () => {
    await createUser('carol')

    const first = await backfillOthersCategory()
    const second = await backfillOthersCategory()

    expect(first.created).toBe(1)
    expect(second.created).toBe(0)
    expect(second.skipped).toHaveLength(1)
  })

  it('adds "Others" alongside a user\'s existing custom categories that are not named "Others"', async () => {
    const user = await createUser('dave')
    await Category.create({ userId: user._id, name: 'Hobbies', isDefault: false })

    const result = await backfillOthersCategory()

    expect(result.created).toBe(1)
    const categories = await Category.find({ userId: user._id })
    expect(categories.map((c) => c.name).sort()).toEqual(['Hobbies', 'Others'])
  })

  it('handles multiple users independently in one run', async () => {
    const withOthers = await createUser('eve')
    await Category.create({ userId: withOthers._id, name: 'Others', isDefault: true })
    const withoutOthers = await createUser('frank')

    const result = await backfillOthersCategory()

    expect(result.usersProcessed).toBe(2)
    expect(result.created).toBe(1)
    expect(result.skipped).toEqual([
      { userId: withOthers._id.toString(), reason: 'already has an "Others" category' },
    ])
    const frankOthers = await Category.findOne({ userId: withoutOthers._id, name: 'Others' })
    expect(frankOthers).not.toBeNull()
  })
})
