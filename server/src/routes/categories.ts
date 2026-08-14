import { Request, Response, Router } from 'express'
import mongoose from 'mongoose'
import Category, { CategoryDocument } from '../models/Category.js'
import Budget from '../models/Budget.js'
import Expense from '../models/Expense.js'

const router = Router()

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function nameConflictQuery(
  userId: string,
  name: string,
  excludeId?: string
): mongoose.QueryFilter<CategoryDocument> {
  const query: mongoose.QueryFilter<CategoryDocument> = {
    userId,
    name: { $regex: `^${escapeRegex(name)}$`, $options: 'i' },
  }
  if (excludeId) query._id = { $ne: excludeId }
  return query
}

router.get('/', async (req: Request, res: Response) => {
  const userId = req.userId as string
  const categories = await Category.find({ userId })
  res.status(200).json(categories)
})

router.post('/', async (req: Request, res: Response) => {
  const userId = req.userId as string
  const name = typeof req.body.name === 'string' ? req.body.name.trim() : ''
  if (!name) {
    return res.status(400).json({ error: 'name is required' })
  }

  const existing = await Category.findOne(nameConflictQuery(userId, name))
  if (existing) {
    return res.status(409).json({ error: 'a category with this name already exists' })
  }

  const category = await Category.create({ userId, name, isDefault: false })
  res.status(201).json(category)
})

router.patch('/:id', async (req: Request<{ id: string }>, res: Response) => {
  const userId = req.userId as string
  const { id } = req.params
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ error: 'category not found' })
  }

  const category = await Category.findOne({ _id: id, userId })
  if (!category) {
    return res.status(404).json({ error: 'category not found' })
  }
  if (category.isDefault) {
    return res.status(403).json({ error: 'predefined categories cannot be modified' })
  }

  const name = typeof req.body.name === 'string' ? req.body.name.trim() : ''
  if (!name) {
    return res.status(400).json({ error: 'name is required' })
  }

  const existing = await Category.findOne(nameConflictQuery(userId, name, id))
  if (existing) {
    return res.status(409).json({ error: 'a category with this name already exists' })
  }

  category.name = name
  await category.save()
  res.status(200).json(category)
})

router.delete('/:id', async (req: Request<{ id: string }>, res: Response) => {
  const userId = req.userId as string
  const { id } = req.params
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ error: 'category not found' })
  }

  const category = await Category.findOne({ _id: id, userId })
  if (!category) {
    return res.status(404).json({ error: 'category not found' })
  }
  if (category.isDefault) {
    return res.status(403).json({ error: 'predefined categories cannot be deleted' })
  }

  const hasBudget = await Budget.exists({ category: id, userId })
  if (hasBudget) {
    return res.status(409).json({ error: 'category has a budget entry and cannot be deleted' })
  }

  const hasExpense = await Expense.exists({ category: id, userId })
  if (hasExpense) {
    return res.status(409).json({ error: 'category has expense entries and cannot be deleted' })
  }

  await category.deleteOne()
  res.status(200).json({ deleted: true })
})

export default router
