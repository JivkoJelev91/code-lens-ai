---
name: nodejs-express
description: Node.js and Express best practices for building secure, performant, maintainable REST APIs. Use when writing, reviewing, or refactoring Express servers, Express 5 routes, middleware, error handling, request validation, or API endpoints.
license: MIT
compatibility: opencode
metadata:
  audience: backend
  workflow: api
---

# Node.js & Express Best Practices

## Project structure

- Separate concerns: routes, middleware, services, models, and config stay in their own files/directories.
- Keep route handlers thin — validate input, call a service, send the response. No business logic in handlers.
- One route file per resource or domain (e.g. `routes/review.ts`, `routes/auth.ts`). Mount under `/api`.
- Centralize error handling in a single error-handling middleware at the bottom of the stack.
- Use `src/` for source and `dist/` for compiled output; never mix them.

## Middleware

- Order matters: parse bodies first, then validate, then authenticate, then handle the route.
- Small, single-purpose middleware; each does one thing and does it well.
- Use `next(err)` to propagate errors — never catch and swallow inside middleware.
- Use async middleware when supported (Express 5). Never block the event loop.
- Prefer built-in or well-audited middleware (`express.json()`, `cors`, `helmet`) over hand-rolled solutions.

## Routing

- Use the proper HTTP method: GET (read), POST (create), PUT/PATCH (update), DELETE (remove).
- Route params for identity (`/api/reviews/:id`), query params for filtering/pagination.
- Keep routes RESTful and consistent. No RPC-style actions in URLs (`/reviews/analyze` > `/analyze`).
- Return correct status codes: 200 OK, 201 Created, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 429 Too Many Requests, 500 Internal Server Error.
- Always return a JSON error response on failure — never leak a raw stack trace.

## Request validation

- Validate every incoming request before processing it — never trust the client.
- Use Zod schemas for every endpoint; infer TS types from them with `z.infer` instead of hand-writing types.
- Use `.strict()` on input schemas so unexpected fields are rejected, not silently accepted.
- Enforce limits: `express.json({ limit: '1mb' })`, string `max()`, `min()` lengths.
- Validate output too (e.g. `reviewSchema.parse(result)`) so the guarantee holds end-to-end.

```ts
export const reviewRequestSchema = z.object({
  code: z.string().trim().min(1).max(MAX_CODE_LENGTH),
}).strict();

export type ReviewRequest = z.infer<typeof reviewRequestSchema>;
```

## Error handling

- Always have a global error-handling middleware (4 arguments: `err, req, res, next`).
- Return generic messages to the client; log the detail server-side.
- Distinguish operational errors (expected, user-caused) from programming errors (bugs).
- Express 5 handles rejected promises natively — throw `new Error` in async handlers, or guard with a small async wrapper for older versions.
- Centralize input errors (e.g. Zod) into `400 Bad Request` with a consistent error shape; throw `401/403/404` explicitly for auth/not-found cases.
- Clean up resources (DB connections, etc.) in error paths and shutdown handlers.

## Security

- Use `helmet` for secure HTTP headers (X-Content-Type-Options, X-Frame-Options, etc.).
- CORS with an explicit allowlist — never `*` in production.
- Set `app.set('trust proxy', 1)` behind a reverse proxy (Docker, Vercel) to get real client IPs.
- Never commit secrets — `.env` with validated `process.env` (e.g. a small Zod env schema).
- Rate-limit per IP or API key on public endpoints.
- HTTPS in production; redirect HTTP to HTTPS.

## Performance

- Never block the event loop — offload CPU-heavy work to worker threads or a separate process.
- Stream large payloads; don't buffer whole files into memory.
- Cache expensive DB results with a sensible TTL.
- Reuse HTTP clients (`connection: keep-alive`); don't spawn connections per request.
- Paginate list endpoints — never return unbounded result sets.

## TypeScript with Express

- Type route params, query, and body explicitly; never `any` for request data.
- Define typed interfaces for `req.body` per route, or better, infer from Zod schemas.
- Use generics on `Request<P, ResBody, ReqBody>` for full type safety.

## Graceful shutdown

- Listen for `SIGINT`/`SIGTERM` and shut down cleanly.
- Close all open connections (DB, Redis) before exiting.
- `process.exit(1)` only after cleanup; `process.exit(0)` for intentional shutdown.
- Log and exit on `uncaughtException`/`unhandledRejection` — don't keep running undefined state.

## Logging

- Structured JSON logging (Pino, Winston) in production — not `console.log` strings.
- Levels: `error` for failures, `warn` for degraded states, `info` for lifecycle.
- Never log passwords, tokens, API keys, or personal data.
- `console` is fine for development only.

## Checklist

- [ ] All input validated and typed before use (Zod schema per endpoint).
- [ ] Error-handling middleware present and used.
- [ ] Secrets not hardcoded or logged.
- [ ] Rate limiting on public endpoints.
- [ ] Correct HTTP status codes.
- [ ] No blocking operations in async handlers.
- [ ] Graceful shutdown covers all resources.
- [ ] Responses don't leak internal details.