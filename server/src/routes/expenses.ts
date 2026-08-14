import { Request, Response, Router } from 'express'
import mongoose from 'mongoose'
import Expense, { MIN_EXPENSE_AMOUNT } from '../models/Expense.js'
import Category from '../models/Category.js'
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

  const expenses = await Expense.find({
    userId,
    date: { $gte: range.start, $lt: range.end },
  }).sort({
    date: -1,
  })
  res.status(200).json(expenses)
})

router.post('/', async (req: Request, res: Response) => {
  const userId = req.userId as string
  const { date: rawDate, amount, category, note } = req.body

  if (rawDate === undefined) {
    return res.status(400).json({ error: 'date is required' })
  }
  const date = new Date(rawDate)
  if (Number.isNaN(date.getTime())) {
    return res.status(400).json({ error: 'date is invalid' })
  }

  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < MIN_EXPENSE_AMOUNT) {
    return res.status(400).json({ error: `amount must be at least ${MIN_EXPENSE_AMOUNT}` })
  }

  if (typeof category !== 'string' || !mongoose.Types.ObjectId.isValid(category)) {
    return res.status(400).json({ error: 'category is invalid' })
  }

  if (note !== undefined && typeof note !== 'string') {
    return res.status(400).json({ error: 'note must be a string' })
  }

  const categoryDoc = await Category.findOne({ _id: category, userId })
  if (!categoryDoc) {
    return res.status(404).json({ error: 'category not found' })
  }

  const expense = await Expense.create({
    userId,
    date,
    amount,
    category,
    ...(typeof note === 'string' ? { note: note.trim() } : {}),
  })
  res.status(201).json(expense)
})

router.patch('/:id', async (req: Request<{ id: string }>, res: Response) => {
  const userId = req.userId as string
  const { id } = req.params
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ error: 'expense not found' })
  }

  const expense = await Expense.findOne({ _id: id, userId })
  if (!expense) {
    return res.status(404).json({ error: 'expense not found' })
  }

  const { date: rawDate, amount, category, note } = req.body

  if (rawDate !== undefined) {
    const date = new Date(rawDate)
    if (Number.isNaN(date.getTime())) {
      return res.status(400).json({ error: 'date is invalid' })
    }
    expense.date = date
  }

  if (amount !== undefined) {
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < MIN_EXPENSE_AMOUNT) {
      return res.status(400).json({ error: `amount must be at least ${MIN_EXPENSE_AMOUNT}` })
    }
    expense.amount = amount
  }

  if (category !== undefined) {
    if (typeof category !== 'string' || !mongoose.Types.ObjectId.isValid(category)) {
      return res.status(400).json({ error: 'category is invalid' })
    }
    const categoryDoc = await Category.findOne({ _id: category, userId })
    if (!categoryDoc) {
      return res.status(404).json({ error: 'category not found' })
    }
    expense.category = new mongoose.Types.ObjectId(category)
  }

  if (note !== undefined) {
    if (typeof note !== 'string') {
      return res.status(400).json({ error: 'note must be a string' })
    }
    expense.note = note.trim()
  }

  await expense.save()
  res.status(200).json(expense)
})

router.delete('/:id', async (req: Request<{ id: string }>, res: Response) => {
  const userId = req.userId as string
  const { id } = req.params
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ error: 'expense not found' })
  }

  const deleted = await Expense.findOneAndDelete({ _id: id, userId })
  if (!deleted) {
    return res.status(404).json({ error: 'expense not found' })
  }

  res.status(200).json({ deleted: true })
})

export default router
