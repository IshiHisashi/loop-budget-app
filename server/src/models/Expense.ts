import mongoose, { Document, Schema, Types } from 'mongoose'

// Shared with the route-level checks in routes/expenses.ts, so the two
// can't drift out of sync — that drift is exactly what let amounts like
// 0.005 (positive, but below this) pass route validation and reach
// Mongoose's schema validation instead, throwing an uncaught
// ValidationError that fell through to a generic 500.
export const MIN_EXPENSE_AMOUNT = 0.01

export interface ExpenseDocument extends Document {
  date: Date
  amount: number
  category: Types.ObjectId
  note?: string
  createdAt: Date
  updatedAt: Date
}

const expenseSchema = new Schema<ExpenseDocument>(
  {
    date: { type: Date, required: true },
    amount: { type: Number, required: true, min: MIN_EXPENSE_AMOUNT },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    note: { type: String, trim: true },
  },
  { timestamps: true }
)

export default mongoose.model<ExpenseDocument>('Expense', expenseSchema)
