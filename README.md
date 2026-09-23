# CodeLens AI

AI-powered code review assistant. Paste code, get a structured review with severity-ranked issues and actionable suggestions. Matrix-themed interface.

Currently supports single-file analysis for any programming language.

## Run locally

Requirements: Node.js 20+ and pnpm.

```bash
pnpm install
pnpm dev
```

- Client: http://localhost:4000
- Server: http://localhost:4001

## Scripts

| Command             | Description                           |
| ------------------- | ------------------------------------- |
| `pnpm dev`          | Run client and server in watch mode   |
| `pnpm build`        | Build client and server for production|
| `pnpm start`        | Start the compiled server             |
| `pnpm lint`         | Lint with Oxlint                      |
| `pnpm test`         | Run unit tests with Vitest            |
| `pnpm eval`         | Run AI evaluation against the dataset |
| `pnpm typecheck`    | Type-check both workspaces            |

Additional scripts (from `server/`): `pnpm test:watch` (watch mode) and `pnpm test:coverage` (Vitest + v8 coverage report).

## Testing

Unit tests run with [Vitest](https://vitest.dev) and cover the deterministic core: semaphore, budget tracking, caching, error classes, and the full review pipeline against a fake AI provider (no model calls). Coverage is measured with the v8 provider.

## Caching

Review results are cached by content hash. By default the server uses a built-in in-memory TTL cache. To use [Redis](https://redis.io) instead, set `REDIS_URL` when starting the server — if the URL is not provided, it simply falls back to the in-memory cache:

```bash
# with Redis
REDIS_URL=redis://localhost:6379 pnpm start

# without Redis (default) — uses the built-in in-memory cache
pnpm start
```

## Production / Deployment

- Build and run the compiled server: `pnpm build && pnpm start`.
- Environment variables are documented in [`.env.example`](.env.example). Production across-the-board: `NODE_ENV=production`, `PORT`, `CORS_ORIGIN` (comma-separated allowed client origins), and optionally `REDIS_URL`.
- Health endpoints (exempt from rate limiting on purpose):
  - `GET /health/live` — process is up (liveness).
  - `GET /health/ready` — ready to serve (pings Redis when configured, otherwise in-memory cache); returns `503` when the cache is unreachable.
- Graceful shutdown: `SIGINT`/`SIGTERM` drain open connections, dispose the cache, and stop the AI provider before exiting.
- The client build in `client/dist` is static — serve it from any static host (or CDN).
- Set `REDIS_URL` to share the review cache across instances (falls back to the built-in in-memory cache when unset).

## Roadmap

- Multi-file analysis
- Code explanation
- Code fixing
- User authentication


## Screenshot
- <img width="1692" height="1263" alt="CodeLens AI screenshot" src="assets/screenshot.png" />

