import mongoose, { Document, Schema, Types } from 'mongoose'

// Shared with the route-level checks in routes/expenses.ts, so the two
// can't drift out of sync — that drift is exactly what let amounts like
// 0.005 (positive, but below this) pass route validation and reach
// Mongoose's schema validation instead, throwing an uncaught
// ValidationError that fell through to a generic 500.
export const MIN_EXPENSE_AMOUNT = 0.01

export interface ExpenseDocument extends Document {
  userId: Types.ObjectId
  date: Date
  amount: number
  category: Types.ObjectId
  note?: string
  subscription?: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const expenseSchema = new Schema<ExpenseDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, required: true },
    amount: { type: Number, required: true, min: MIN_EXPENSE_AMOUNT },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    note: { type: String, trim: true },
    subscription: { type: Schema.Types.ObjectId, ref: 'Subscription' },
  },
  { timestamps: true }
)

// At most one generated expense per subscription per month — the
// clamped date generation computes is deterministic for a given
// subscription+month, so this index turns a concurrent-request race
// into a safe duplicate-key no-op instead of a duplicate expense.
// Scoped to documents that have a subscription so manually-logged
// expenses (no subscription) can still share any date freely.
expenseSchema.index(
  { subscription: 1, date: 1 },
  { unique: true, partialFilterExpression: { subscription: { $exists: true } } }
)

export default mongoose.model<ExpenseDocument>('Expense', expenseSchema)
