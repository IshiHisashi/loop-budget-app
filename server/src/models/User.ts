import mongoose, { Document, Schema } from 'mongoose'

export interface UserDocument extends Document {
  username: string
  passwordHash: string
  createdAt: Date
  updatedAt: Date
}

const userSchema = new Schema<UserDocument>(
  {
    // Named `username`, not `id` — a schema field literally named `id`
    // would collide with Mongoose's built-in `.id` virtual (which
    // returns `_id.toString()`) on every document. The public API
    // request/response field is still called `id`, matching the
    // existing login/signup request shape.
    username: { type: String, required: true, trim: true, unique: true },
    passwordHash: { type: String, required: true },
  },
  { timestamps: true }
)

export default mongoose.model<UserDocument>('User', userSchema)
