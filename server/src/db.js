import mongoose from 'mongoose'

export async function connectDB(uri) {
  try {
    await mongoose.connect(uri)
  } catch (err) {
    console.warn('MongoDB connection failed at startup:', err.message)
  }
}
