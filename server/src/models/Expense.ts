import mongoose, { Document, Schema, Types } from 'mongoose'

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
    amount: { type: Number, required: true, min: 0.01 },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    note: { type: String, trim: true },
  },
  { timestamps: true }
)

export default mongoose.model<ExpenseDocument>('Expense', expenseSchema)
