import mongoose, { Document, Schema, Types } from 'mongoose'

export interface CategoryDocument extends Document {
  userId: Types.ObjectId
  name: string
  isDefault: boolean
  createdAt: Date
  updatedAt: Date
}

const categorySchema = new Schema<CategoryDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
)

// Replaces the old global `unique: true` on `name` now that categories
// are per-account — two accounts can each have their own "Food", the
// same account still can't have two. (This is a case-sensitive backup;
// the route-level check in categories.ts does the real case-insensitive
// comparison, same as before, now scoped by userId too.)
categorySchema.index({ userId: 1, name: 1 }, { unique: true })

export default mongoose.model<CategoryDocument>('Category', categorySchema)
