import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import app from '../app.js'
import Budget from '../models/Budget.js'
import Category from '../models/Category.js'
import Expense from '../models/Expense.js'
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
  await Budget.deleteMany({})
  await Category.deleteMany({})
})

afterAll(async () => {
  await mongoose.disconnect()
  await mongod.stop()
})

describe('GET /api/budget-vs-actual', () => {
  it('rejects a missing month', async () => {
    const res = await agent.get('/api/budget-vs-actual')

    expect(res.status).toBe(400)
  })

  it('rejects a malformed month', async () => {
    const res = await agent.get('/api/budget-vs-actual?month=2026-13')

    expect(res.status).toBe(400)
  })

  it('rejects a non-YYYY-MM month string', async () => {
    const res = await agent.get('/api/budget-vs-actual?month=January')

    expect(res.status).toBe(400)
  })

  it('sums budgeted and actual for a category with both', async () => {
    const category = await Category.create({ userId, name: 'Groceries', isDefault: false })
    await Budget.create({ userId, category: category._id, amount: 300 })
    await Expense.create({ userId, date: '2026-01-05', amount: 40, category: category._id })
    await Expense.create({ userId, date: '2026-01-20', amount: 25.5, category: category._id })

    const res = await agent.get('/api/budget-vs-actual?month=2026-01')

    expect(res.status).toBe(200)
    const row = res.body.find((r: { category: string }) => r.category === category._id.toString())
    expect(row).toMatchObject({ budgeted: 300, actual: 65.5 })
  })

  it('reports actual: 0 for a category with a budget but no expenses that month', async () => {
    const category = await Category.create({ userId, name: 'Groceries', isDefault: false })
    await Budget.create({ userId, category: category._id, amount: 300 })

    const res = await agent.get('/api/budget-vs-actual?month=2026-01')

    const row = res.body.find((r: { category: string }) => r.category === category._id.toString())
    expect(row).toMatchObject({ budgeted: 300, actual: 0 })
  })

  it('reports budgeted: 0 for a category with expenses but no budget', async () => {
    const category = await Category.create({ userId, name: 'Groceries', isDefault: false })
    await Expense.create({ userId, date: '2026-01-05', amount: 40, category: category._id })

    const res = await agent.get('/api/budget-vs-actual?month=2026-01')

    const row = res.body.find((r: { category: string }) => r.category === category._id.toString())
    expect(row).toMatchObject({ budgeted: 0, actual: 40 })
  })

  it('includes a category with neither a budget nor expenses, both 0', async () => {
    const category = await Category.create({ userId, name: 'Groceries', isDefault: false })

    const res = await agent.get('/api/budget-vs-actual?month=2026-01')

    const row = res.body.find((r: { category: string }) => r.category === category._id.toString())
    expect(row).toMatchObject({ budgeted: 0, actual: 0 })
  })

  it('excludes expenses outside the requested month', async () => {
    const category = await Category.create({ userId, name: 'Groceries', isDefault: false })
    await Expense.create({ userId, date: '2025-12-31', amount: 50, category: category._id })
    await Expense.create({ userId, date: '2026-02-01', amount: 60, category: category._id })
    await Expense.create({ userId, date: '2026-01-15', amount: 10, category: category._id })

    const res = await agent.get('/api/budget-vs-actual?month=2026-01')

    const row = res.body.find((r: { category: string }) => r.category === category._id.toString())
    expect(row.actual).toBe(10)
  })

  it('excludes expenses from a different category', async () => {
    const groceries = await Category.create({ userId, name: 'Groceries', isDefault: false })
    const housing = await Category.create({ userId, name: 'Housing', isDefault: false })
    await Expense.create({ userId, date: '2026-01-05', amount: 40, category: groceries._id })
    await Expense.create({ userId, date: '2026-01-05', amount: 1200, category: housing._id })

    const res = await agent.get('/api/budget-vs-actual?month=2026-01')

    const groceriesRow = res.body.find(
      (r: { category: string }) => r.category === groceries._id.toString()
    )
    const housingRow = res.body.find(
      (r: { category: string }) => r.category === housing._id.toString()
    )
    expect(groceriesRow.actual).toBe(40)
    expect(housingRow.actual).toBe(1200)
  })

  it('rounds floating-point sums to 2 decimal places', async () => {
    const category = await Category.create({ userId, name: 'Groceries', isDefault: false })
    await Expense.create({ userId, date: '2026-01-01', amount: 0.1, category: category._id })
    await Expense.create({ userId, date: '2026-01-02', amount: 0.2, category: category._id })

    const res = await agent.get('/api/budget-vs-actual?month=2026-01')

    const row = res.body.find((r: { category: string }) => r.category === category._id.toString())
    expect(row.actual).toBe(0.3)
  })

  it('handles a December month correctly (year rollover)', async () => {
    const category = await Category.create({ userId, name: 'Groceries', isDefault: false })
    await Expense.create({ userId, date: '2025-12-15', amount: 20, category: category._id })
    await Expense.create({ userId, date: '2026-01-01', amount: 999, category: category._id })

    const res = await agent.get('/api/budget-vs-actual?month=2025-12')

    const row = res.body.find((r: { category: string }) => r.category === category._id.toString())
    expect(row.actual).toBe(20)
  })

  it('does not include another account categories, budgets, or expenses', async () => {
    const other = await getAuthenticatedAgent(app)
    const theirCategory = await Category.create({
      userId: other.userId,
      name: 'Groceries',
      isDefault: false,
    })
    await Budget.create({ userId: other.userId, category: theirCategory._id, amount: 500 })
    await Expense.create({
      userId: other.userId,
      date: '2026-01-05',
      amount: 100,
      category: theirCategory._id,
    })

    const res = await agent.get('/api/budget-vs-actual?month=2026-01')

    expect(
      res.body.some((r: { category: string }) => r.category === theirCategory._id.toString())
    ).toBe(false)
  })
})
