import mongoose from 'mongoose'

// Without this, a query issued while disconnected (e.g. Mongo down at
// boot) buffers indefinitely instead of failing — routes would hang
// forever rather than erroring, since there's no default buffer timeout.
mongoose.set('bufferCommands', false)

export async function connectDB(uri: string | undefined): Promise<void> {
  try {
    if (!uri) {
      throw new Error('MONGODB_URI is not set')
    }
    await mongoose.connect(uri)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.warn('MongoDB connection failed at startup:', message)
  }
}
