import mongoose from 'mongoose'

// Without this, a query issued while disconnected (e.g. Mongo down at
// boot) buffers indefinitely instead of failing — routes would hang
// forever rather than erroring, since there's no default buffer timeout.
mongoose.set('bufferCommands', false)

export async function connectDB(uri) {
  try {
    await mongoose.connect(uri)
  } catch (err) {
    console.warn('MongoDB connection failed at startup:', err.message)
  }
}
