import express from 'express'

const app = express()
const PORT = 4001

app.use(express.json())

app.get('/', (_req, res) => {
  res.json({ message: 'CodeLens AI server is running.' })
})

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`)
})