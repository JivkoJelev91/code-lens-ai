import express from 'express';
import { createOpencodeClient, createOpencodeServer } from '@opencode-ai/sdk';
import { reviewCode } from './ai.js';

const app = express();
const PORT = 4001;

app.use(express.json());

app.get('/', (_req, res) => {
  res.json({ message: 'CodeLens AI server is running.' });
});

const opencode = await createOpencodeServer({ timeout: 30000 });
const client = createOpencodeClient({ baseUrl: opencode.url });

app.post('/api/review', async (req, res) => {
  const { code } = req.body;
  if (typeof code !== 'string' || code.trim() === '') {
    res.status(400).json({ error: 'Missing or empty "code".' });
    return;
  }
  try {
    const review = await reviewCode(client, code);
    res.json(review);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Review failed, try again!' });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});

// Shut down the embedded opencode server when the API server stops.
// Without this, the spawned `opencode serve` process would orphan and keep
// holding port 4096, breaking the next run with a "port already in use" error.
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    opencode.close();
    process.exit(0);
  });
}