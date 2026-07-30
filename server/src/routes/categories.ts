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
  name: string,
  excludeId?: string
): mongoose.QueryFilter<CategoryDocument> {
  const query: mongoose.QueryFilter<CategoryDocument> = {
    name: { $regex: `^${escapeRegex(name)}$`, $options: 'i' },
  }
  if (excludeId) query._id = { $ne: excludeId }
  return query
}

router.get('/', async (_req: Request, res: Response) => {
  const categories = await Category.find()
  res.status(200).json(categories)
})

router.post('/', async (req: Request, res: Response) => {
  const name = typeof req.body.name === 'string' ? req.body.name.trim() : ''
  if (!name) {
    return res.status(400).json({ error: 'name is required' })
  }

  const existing = await Category.findOne(nameConflictQuery(name))
  if (existing) {
    return res.status(409).json({ error: 'a category with this name already exists' })
  }

  const category = await Category.create({ name, isDefault: false })
  res.status(201).json(category)
})

router.patch('/:id', async (req: Request<{ id: string }>, res: Response) => {
  const { id } = req.params
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ error: 'category not found' })
  }

  const category = await Category.findById(id)
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

  const existing = await Category.findOne(nameConflictQuery(name, id))
  if (existing) {
    return res.status(409).json({ error: 'a category with this name already exists' })
  }

  category.name = name
  await category.save()
  res.status(200).json(category)
})

router.delete('/:id', async (req: Request<{ id: string }>, res: Response) => {
  const { id } = req.params
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ error: 'category not found' })
  }

  const category = await Category.findById(id)
  if (!category) {
    return res.status(404).json({ error: 'category not found' })
  }
  if (category.isDefault) {
    return res.status(403).json({ error: 'predefined categories cannot be deleted' })
  }

  const hasBudget = await Budget.exists({ category: id })
  if (hasBudget) {
    return res.status(409).json({ error: 'category has a budget entry and cannot be deleted' })
  }

  const hasExpense = await Expense.exists({ category: id })
  if (hasExpense) {
    return res.status(409).json({ error: 'category has expense entries and cannot be deleted' })
  }

  await category.deleteOne()
  res.status(200).json({ deleted: true })
})

export default router
