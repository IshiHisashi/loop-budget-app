import mongoose, { Document, Schema } from 'mongoose'

export interface CategoryDocument extends Document {
  name: string
  isDefault: boolean
  createdAt: Date
  updatedAt: Date
}

const categorySchema = new Schema<CategoryDocument>(
  {
    name: { type: String, required: true, trim: true, unique: true },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
)

export default mongoose.model<CategoryDocument>('Category', categorySchema)
