import 'dotenv/config'
import app from './app.js'
import { connectDB } from './db.js'

const PORT = process.env.PORT || 3001

await connectDB(process.env.MONGODB_URI)

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`)
})
