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
  subscriptionMonth?: string
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
    // YYYY-MM the expense was generated for. Keyed separately from `date`
    // because `date` is derived from the subscription's `dayOfMonth` at
    // generation time, which can change later via PATCH — the index below
    // needs a value that stays stable across such edits so it still dedupes
    // to "one generated expense per subscription per month".
    subscriptionMonth: { type: String },
  },
  { timestamps: true }
)

// At most one generated expense per subscription per month. Indexed on
// subscriptionMonth (not date) because date is derived from a
// subscription's dayOfMonth at generation time and can drift if the
// subscription is edited afterwards — subscriptionMonth stays fixed, so
// this still turns a concurrent-request race, or a re-generation after a
// dayOfMonth edit, into a safe duplicate-key no-op instead of a duplicate
// expense. Scoped to documents that have a subscription so manually-logged
// expenses (no subscription) can still share any date freely.
expenseSchema.index(
  { subscription: 1, subscriptionMonth: 1 },
  { unique: true, partialFilterExpression: { subscription: { $exists: true } } }
)

export default mongoose.model<ExpenseDocument>('Expense', expenseSchema)
