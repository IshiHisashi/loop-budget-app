import { Request, Response, Router } from 'express'
import mongoose from 'mongoose'

const router = Router()

router.get('/health', (_req: Request, res: Response) => {
  const db = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  res.status(200).json({ status: 'ok', db })
})

export default router
