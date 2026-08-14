import { Types } from 'mongoose'
import Category from '../models/Category.js'

export const DEFAULT_CATEGORY_NAMES: string[] = [
  'Food',
  'Rent',
  'Transport',
  'Entertainment',
  'Utilities',
]

export async function seedDefaultCategoriesForUser(
  userId: Types.ObjectId | string
): Promise<void> {
  const count = await Category.countDocuments({ userId })
  if (count > 0) return

  await Category.insertMany(
    DEFAULT_CATEGORY_NAMES.map((name) => ({ userId, name, isDefault: true }))
  )
}
