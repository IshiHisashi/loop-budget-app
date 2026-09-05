import 'dotenv/config'
import mongoose from 'mongoose'
import { connectDB } from '../db.js'
import { backfillOthersCategory } from './backfillOthersCategory.js'

await connectDB(process.env.MONGODB_URI)

if (mongoose.connection.readyState !== 1) {
  console.error('Could not connect to MongoDB — aborting migration without making any changes.')
  process.exit(1)
}

const result = await backfillOthersCategory()

console.log(`Users processed: ${result.usersProcessed}`)
console.log(`"Others" categories created: ${result.created}`)
console.log(`Skipped: ${result.skipped.length}`)
for (const skip of result.skipped) {
  console.log(`  - user ${skip.userId}: ${skip.reason}`)
}

await mongoose.disconnect()
