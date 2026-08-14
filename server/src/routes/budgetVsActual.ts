import { Request, Response, Router } from 'express'
import Budget from '../models/Budget.js'
import Category from '../models/Category.js'
import Expense from '../models/Expense.js'
import { parseMonthRange } from '../utils/monthRange.js'

const router = Router()

router.get('/', async (req: Request, res: Response) => {
  const userId = req.userId as string
  const month = req.query.month
  if (typeof month !== 'string') {
    return res.status(400).json({ error: 'month must be in YYYY-MM format' })
  }
  const range = parseMonthRange(month)
  if (!range) {
    return res.status(400).json({ error: 'month must be in YYYY-MM format' })
  }
  const { start, end } = range

  const [categories, budgets, expenses] = await Promise.all([
    Category.find({ userId }),
    Budget.find({ userId }),
    Expense.find({ userId, date: { $gte: start, $lt: end } }),
  ])

  const budgetByCategory = new Map(budgets.map((budget) => [budget.category.toString(), budget.amount]))

  const actualByCategory = new Map<string, number>()
  for (const expense of expenses) {
    const key = expense.category.toString()
    actualByCategory.set(key, (actualByCategory.get(key) ?? 0) + expense.amount)
  }

  const rows = categories.map((category) => {
    const id = category._id.toString()
    const actual = Math.round((actualByCategory.get(id) ?? 0) * 100) / 100
    return {
      category: id,
      budgeted: budgetByCategory.get(id) ?? 0,
      actual,
    }
  })

  res.status(200).json(rows)
})

export default router
