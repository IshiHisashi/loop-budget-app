import Category from '../models/Category.js'
import User from '../models/User.js'

export interface BackfillSkip {
  userId: string
  reason: string
}

export interface BackfillResult {
  usersProcessed: number
  created: number
  skipped: BackfillSkip[]
}

// Re-runnable: the case-insensitive existence check below is what makes
// a second run a no-op (it finds the "Others" category the first run
// just created, or one the user already had, and skips every account).
export async function backfillOthersCategory(): Promise<BackfillResult> {
  const result: BackfillResult = { usersProcessed: 0, created: 0, skipped: [] }

  for await (const user of User.find().cursor()) {
    result.usersProcessed++

    const existing = await Category.findOne({
      userId: user._id,
      name: { $regex: '^others$', $options: 'i' },
    })

    if (existing) {
      result.skipped.push({
        userId: String(user._id),
        reason: 'already has an "Others" category',
      })
      continue
    }

    await Category.create({ userId: user._id, name: 'Others', isDefault: true })
    result.created++
  }

  return result
}
