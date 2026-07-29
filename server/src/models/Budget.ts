import mongoose, { Document, Schema, Types } from 'mongoose'

export interface BudgetDocument extends Document {
  category: Types.ObjectId
  amount: number
  createdAt: Date
  updatedAt: Date
}

const budgetSchema = new Schema<BudgetDocument>(
  {
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
