import mongoose, { Document, Schema, Types } from 'mongoose'
import { MIN_EXPENSE_AMOUNT } from './Expense.js'

export interface SubscriptionDocument extends Document {
  userId: Types.ObjectId
  name?: string
  amount: number
  category: Types.ObjectId
  dayOfMonth: number
  startMonth: string
  endMonth?: string
  createdAt: Date
  updatedAt: Date
}

const subscriptionSchema = new Schema<SubscriptionDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, trim: true },
    // Shares Expense's minimum rather than defining its own — a
    // subscription's amount is copied straight into a generated Expense,
    // which enforces this same floor, so a smaller subscription minimum
    // would let one be created that can never actually generate anything.
    amount: { type: Number, required: true, min: MIN_EXPENSE_AMOUNT },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    dayOfMonth: { type: Number, required: true, min: 1, max: 31 },
    startMonth: { type: String, required: true },
    endMonth: { type: String },
  },
  { timestamps: true }
)

export default mongoose.model<SubscriptionDocument>('Subscription', subscriptionSchema)
