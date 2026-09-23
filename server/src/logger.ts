import { randomUUID } from 'node:crypto';
import { AsyncLocalStorage } from 'node:async_hooks';
import type { NextFunction, Request, Response } from 'express';
import pino from 'pino';
import type { Logger } from 'pino';

const isDev = process.env.NODE_ENV !== 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (isDev ? 'debug' : 'info'),
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.headers["x-api-key"]',
      'err.config.headers.authorization',
      'password',
      '*.password',
      'token',
      '*.token',
      'secret',
      '*.secret',
      'apiKey',
      '*.apiKey',
    ],
    censor: '[redacted]',
  },
  ...(isDev && {
    transport: {
      target: 'pino/file',
      options: { destination: 1 },
    },
  }),
});

export interface RequestContext {
  reqId: string;
  log: Logger;
}

const requestStore = new AsyncLocalStorage<RequestContext>();

export const runWithRequestId = (reqId: string, fn: () => void): void => {
  requestStore.run({ reqId, log: logger.child({ reqId }) }, fn);
};

export const getRequestLogger = (): Logger => requestStore.getStore()?.log ?? logger;

const REQUEST_ID_PATTERN = /^[A-Za-z0-9:_-]{1,64}$/;

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const startedAt = Date.now();
  const incoming = req.get('x-request-id');
  const reqId = incoming && REQUEST_ID_PATTERN.test(incoming) ? incoming : randomUUID();

  res.setHeader('X-Request-Id', reqId);

  runWithRequestId(reqId, () => {
    const log = getRequestLogger();
    res.on('finish', () => {
      const durationMs = Date.now() - startedAt;
      log.info(
        {
          method: req.method,
          url: req.originalUrl ?? req.url,
          status: res.statusCode,
          durationMs,
          ip: req.ip,
          ua: req.get('user-agent'),
          bytes: Number(res.getHeader('content-length')) || undefined,
          cache: res.getHeader('X-Cache') as string | undefined,
        },
        'request completed',
      );
    });
    next();
  });
};