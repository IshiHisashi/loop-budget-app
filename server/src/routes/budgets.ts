import { Request, Response, Router } from 'express'
import mongoose from 'mongoose'
import Budget from '../models/Budget.js'
import Category from '../models/Category.js'

const router = Router()

router.get('/', async (req: Request, res: Response) => {
  const userId = req.userId as string
  const budgets = await Budget.find({ userId })
  res.status(200).json(budgets)
})

router.put('/:categoryId', async (req: Request<{ categoryId: string }>, res: Response) => {
  const userId = req.userId as string
  const { categoryId } = req.params
  if (!mongoose.Types.ObjectId.isValid(categoryId)) {
    return res.status(400).json({ error: 'invalid categoryId' })
  }

  const amount = req.body.amount
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0) {
    return res.status(400).json({ error: 'amount must be a non-negative number' })
  }

  const category = await Category.findOne({ _id: categoryId, userId })
  if (!category) {
    return res.status(404).json({ error: 'category not found' })
  }

  const budget = await Budget.findOneAndUpdate(
    { category: categoryId, userId },
    { amount },
    { upsert: true, returnDocument: 'after', runValidators: true }
  )
  res.status(200).json(budget)
})

router.delete('/:categoryId', async (req: Request<{ categoryId: string }>, res: Response) => {
  const userId = req.userId as string
  const { categoryId } = req.params
  if (!mongoose.Types.ObjectId.isValid(categoryId)) {
    return res.status(404).json({ error: 'budget not found' })
  }

  const deleted = await Budget.findOneAndDelete({ category: categoryId, userId })
  if (!deleted) {
    return res.status(404).json({ error: 'budget not found' })
  }

  res.status(200).json({ deleted: true })
})

export default router
