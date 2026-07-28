import mongoose from 'mongoose'

const { Schema } = mongoose

const categorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
)

export default mongoose.model('Category', categorySchema)
