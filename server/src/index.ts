import express, { type ErrorRequestHandler } from 'express';
import helmet from 'helmet';
import type { OpencodeClient } from '@opencode-ai/sdk';
import { createOpencodeClient, createOpencodeServer } from '@opencode-ai/sdk';
import { reviewCode } from './ai.js';
import { rateLimit } from './middleware.js';
import { reviewRequestSchema } from './schemas.js';

const TIMEOUT = 30_000;

const PORT = Number(process.env.PORT ?? 4001);
const HOST = process.env.HOST ?? '0.0.0.0';

const timeout = (ms: number) =>
  new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('TIMEOUT')), ms),
  );

const app = express();

app.set('trust proxy', 1);
app.use(helmet());
app.use(express.json({ limit: '128kb' }));

app.get('/', (_req, res) => {
  res.json({ message: 'CodeLens AI server is running.' });
});

let client!: OpencodeClient;

app.post('/api/review', rateLimit, async (req, res) => {
  const parsed = reviewRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: parsed.error.issues[0]?.message ?? 'Invalid request.' });
    return;
  }

  try {
    const review = await Promise.race([
      reviewCode(client, parsed.data.code),
      timeout(TIMEOUT),
    ]);
    res.json(review);
  } catch (error) {
    console.error(error);
    const isTimeout = error instanceof Error && error.message === 'TIMEOUT';
    res.status(isTimeout ? 504 : 500).json({
      error: isTimeout
        ? 'Review timed out. Please try again.'
        : 'Review failed, try again!',
    });
  }
});

const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (res.headersSent) return;
  const { status, type } = error as { status?: number; type?: string };

  if (type === 'entity.parse.failed') {
    res.status(400).json({ error: 'Invalid JSON in request body.' });
  } else if (status === 413) {
    res.status(413).json({ error: 'Request body too large.' });
  } else if (status !== undefined && status >= 400 && status < 500) {
    res.status(status).json({ error: 'Request could not be processed.' });
  } else {
    console.error(error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};
app.use(errorHandler);

async function main() {
  const opencode = await createOpencodeServer({ timeout: TIMEOUT, port: 0 });
  client = createOpencodeClient({ baseUrl: opencode.url });

  app.listen(PORT, HOST, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });

  const shutdown = () => {
    opencode.close();
    process.exit(0);
  };
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, shutdown);
  }
  process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
    opencode.close();
    process.exit(1);
  });
  process.on('unhandledRejection', (reason) => {
    console.error('Unhandled rejection:', reason);
    opencode.close();
    process.exit(1);
  });
}

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});