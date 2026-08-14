import mongoose, { Document, Schema, Types } from 'mongoose'

export interface BudgetDocument extends Document {
  userId: Types.ObjectId
  category: Types.ObjectId
  amount: number
  createdAt: Date
  updatedAt: Date
}

const budgetSchema = new Schema<BudgetDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    // The existing unique-per-category constraint needs no change now
    // that categories are per-account documents (see Category.ts) —
    // "at most one budget per category document" already means "at
    // most one budget per category per account."
    category: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
      unique: true,
    },
    amount: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
)

export default mongoose.model<BudgetDocument>('Budget', budgetSchema)
