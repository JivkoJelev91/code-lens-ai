import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import pino from 'pino';

const isDev = process.env.NODE_ENV !== 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (isDev ? 'debug' : 'info'),
  ...(isDev && {
    transport: {
      target: 'pino/file',
      options: { destination: 1 },
    },
  }),
});

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const startedAt = Date.now();
  const reqId = randomUUID();

  res.setHeader('X-Request-Id', reqId);

  res.on('finish', () => {
    const durationMs = Date.now() - startedAt;
    logger.info(
      {
        reqId,
        method: req.method,
        url: req.originalUrl ?? req.url,
        status: res.statusCode,
        durationMs,
        ip: req.ip,
        sessionId: req.sessionId,
      },
      'request completed',
    );
  });

  next();
}