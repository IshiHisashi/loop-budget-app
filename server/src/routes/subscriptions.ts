import { Request, Response, Router } from 'express'
import mongoose from 'mongoose'
import Subscription from '../models/Subscription.js'
import { MIN_EXPENSE_AMOUNT } from '../models/Expense.js'
import Category from '../models/Category.js'
import { parseMonthRange } from '../utils/monthRange.js'

const router = Router()

function isValidDayOfMonth(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 31
}

router.get('/', async (req: Request, res: Response) => {
  const userId = req.userId as string
  const subscriptions = await Subscription.find({ userId })
  res.status(200).json(subscriptions)
})

router.post('/', async (req: Request, res: Response) => {
  const userId = req.userId as string
  const { name, amount, category, dayOfMonth, startMonth, endMonth } = req.body

  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < MIN_EXPENSE_AMOUNT) {
    return res.status(400).json({ error: `amount must be at least ${MIN_EXPENSE_AMOUNT}` })
  }

  if (typeof category !== 'string' || !mongoose.Types.ObjectId.isValid(category)) {
    return res.status(400).json({ error: 'category is invalid' })
  }

  if (!isValidDayOfMonth(dayOfMonth)) {
    return res.status(400).json({ error: 'dayOfMonth must be an integer between 1 and 31' })
  }

  if (typeof startMonth !== 'string' || !parseMonthRange(startMonth)) {
    return res.status(400).json({ error: 'startMonth must be in YYYY-MM format' })
  }

  if (endMonth !== undefined) {
    if (typeof endMonth !== 'string' || !parseMonthRange(endMonth)) {
      return res.status(400).json({ error: 'endMonth must be in YYYY-MM format' })
    }
    if (endMonth < startMonth) {
      return res.status(400).json({ error: 'endMonth cannot precede startMonth' })
    }
  }

  if (name !== undefined && typeof name !== 'string') {
    return res.status(400).json({ error: 'name must be a string' })
  }

  const categoryDoc = await Category.findOne({ _id: category, userId })
  if (!categoryDoc) {
    return res.status(404).json({ error: 'category not found' })
  }

  const subscription = await Subscription.create({
    userId,
    amount,
    category,
    dayOfMonth,
    startMonth,
    ...(endMonth !== undefined ? { endMonth } : {}),
    ...(typeof name === 'string' ? { name: name.trim() } : {}),
  })
  res.status(201).json(subscription)
})

router.patch('/:id', async (req: Request<{ id: string }>, res: Response) => {
  const userId = req.userId as string
  const { id } = req.params
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ error: 'subscription not found' })
  }

  const subscription = await Subscription.findOne({ _id: id, userId })
  if (!subscription) {
    return res.status(404).json({ error: 'subscription not found' })
  }

  const { name, amount, category, dayOfMonth, startMonth, endMonth } = req.body

  if (amount !== undefined) {
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < MIN_EXPENSE_AMOUNT) {
      return res.status(400).json({ error: `amount must be at least ${MIN_EXPENSE_AMOUNT}` })
    }
    subscription.amount = amount
  }

  if (category !== undefined) {
    if (typeof category !== 'string' || !mongoose.Types.ObjectId.isValid(category)) {
      return res.status(400).json({ error: 'category is invalid' })
    }
    const categoryDoc = await Category.findOne({ _id: category, userId })
    if (!categoryDoc) {
      return res.status(404).json({ error: 'category not found' })
    }
    subscription.category = new mongoose.Types.ObjectId(category)
  }

  if (dayOfMonth !== undefined) {
    if (!isValidDayOfMonth(dayOfMonth)) {
      return res.status(400).json({ error: 'dayOfMonth must be an integer between 1 and 31' })
    }
    subscription.dayOfMonth = dayOfMonth
  }

  if (startMonth !== undefined) {
    if (typeof startMonth !== 'string' || !parseMonthRange(startMonth)) {
      return res.status(400).json({ error: 'startMonth must be in YYYY-MM format' })
    }
    subscription.startMonth = startMonth
  }

  if (endMonth !== undefined) {
    if (endMonth === null) {
      subscription.endMonth = undefined
    } else {
      if (typeof endMonth !== 'string' || !parseMonthRange(endMonth)) {
        return res.status(400).json({ error: 'endMonth must be in YYYY-MM format' })
      }
      subscription.endMonth = endMonth
    }
  }

  if (name !== undefined) {
    if (typeof name !== 'string') {
      return res.status(400).json({ error: 'name must be a string' })
    }
    subscription.name = name.trim()
  }

  if (subscription.endMonth !== undefined && subscription.endMonth < subscription.startMonth) {
    return res.status(400).json({ error: 'endMonth cannot precede startMonth' })
  }

  await subscription.save()
  res.status(200).json(subscription)
})

router.delete('/:id', async (req: Request<{ id: string }>, res: Response) => {
  const userId = req.userId as string
  const { id } = req.params
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ error: 'subscription not found' })
  }

  const deleted = await Subscription.findOneAndDelete({ _id: id, userId })
  if (!deleted) {
    return res.status(404).json({ error: 'subscription not found' })
  }

  res.status(200).json({ deleted: true })
})

export default router
