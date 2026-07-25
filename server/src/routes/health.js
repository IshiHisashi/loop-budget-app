import { Router } from 'express'
import mongoose from 'mongoose'

const router = Router()

router.get('/health', (req, res) => {
  const db = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  res.status(200).json({ status: 'ok', db })
})

export default router
