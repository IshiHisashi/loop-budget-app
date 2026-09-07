import { Request, Response, Router } from 'express'
import mongoose from 'mongoose'
import Expense, { MIN_EXPENSE_AMOUNT } from '../models/Expense.js'
import Category from '../models/Category.js'
import Subscription from '../models/Subscription.js'
import { parseMonthRange } from '../utils/monthRange.js'
import { clampDayOfMonth } from '../utils/dayOfMonth.js'

const router = Router()

function isDuplicateKeyError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: unknown }).code === 11000
}

// Lazily materializes this month's expense for every subscription
// active in it, so a recurring expense shows up without a cron/scheduler
// — the tradeoff is it only appears once someone has viewed that month.
// The upsert races safely under concurrent calls for the same month:
// Expense's partial unique index on (subscription, subscriptionMonth) makes
// the loser's insert a duplicate-key error, caught below as a no-op rather
// than a duplicate expense. Keying on subscriptionMonth (not date) also
// makes a later dayOfMonth edit a no-op instead of a second expense: date
// is derived from dayOfMonth at generation time and can drift, but
// subscriptionMonth doesn't.
async function generateSubscriptionExpenses(userId: string, month: string): Promise<void> {
  const [year, monthNumber] = month.split('-').map(Number)
  const subscriptions = await Subscription.find({
    userId,
    startMonth: { $lte: month },
    $or: [{ endMonth: { $exists: false } }, { endMonth: { $gte: month } }],
  })

  for (const subscription of subscriptions) {
    const day = clampDayOfMonth(year, monthNumber, subscription.dayOfMonth)
    const date = new Date(Date.UTC(year, monthNumber - 1, day))

    try {
      await Expense.updateOne(
        { userId, subscription: subscription._id, subscriptionMonth: month },
        {
          $setOnInsert: {
            userId,
            subscription: subscription._id,
            subscriptionMonth: month,
            date,
            amount: subscription.amount,
            category: subscription.category,
          },
        },
        { upsert: true }
      )
    } catch (err) {
      if (!isDuplicateKeyError(err)) throw err
    }
  }
}

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

  await generateSubscriptionExpenses(userId, month)

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
