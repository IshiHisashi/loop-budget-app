import Category from '../models/Category.js'

export const DEFAULT_CATEGORY_NAMES: string[] = [
  'Food',
  'Rent',
  'Transport',
  'Entertainment',
  'Utilities',
]

export async function seedDefaultCategories(): Promise<void> {
  const count = await Category.countDocuments()
  if (count > 0) return

  await Category.insertMany(
    DEFAULT_CATEGORY_NAMES.map((name) => ({ name, isDefault: true }))
  )
}
