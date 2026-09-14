---
name: nodejs-express
description: Node.js and Express.js best practices for building secure, performant, and maintainable REST APIs. Use when writing, reviewing, or refactoring Express servers, middleware, routes, or API endpoints.
---

# Node.js & Express Best Practices

## Project structure

- Separate concerns: routes, middleware, services, models, and config stay in their own files/directories.
- Keep route handlers thin — validate input, call a service, send the response.
- One route file per resource or domain (e.g. `routes/review.ts`, `routes/auth.ts`).
- Centralize error handling in a single error-handling middleware at the bottom of the stack.
- Use `src/` for source and `dist/` for compiled output; never mix them.

## Middleware

- Order matters: parse bodies first, then validate, then authenticate, then handle the route.
- Write small, single-purpose middleware. Each does one thing and does it well.
- Use `next(err)` to propagate errors — never catch and swallow inside middleware.
- Don't block the event loop in middleware. Use async middleware only when the framework supports it (Express 5 does).
- Prefer built-in or well-audited middleware (`express.json()`, `cors`, `helmet`) over hand-rolled solutions.

## Routing

- Use the appropriate HTTP method: GET (read), POST (create), PUT/PATCH (update), DELETE (remove).
- Use route parameters for resource identity (`/api/reviews/:id`), query parameters for filtering/pagination.
- Keep routes RESTful and consistent. Don't put RPC-style actions in the URL.
- Return proper status codes: 200 OK, 201 Created, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 429 Too Many Requests, 500 Internal Server Error.
- Always return a JSON error response on failure — never let the client see a raw stack trace.

## Request validation

- Validate every incoming request before processing it. Never trust the client.
- Check `typeof` and shape of `req.body` fields before using them.
- Reject unexpected fields — allow only what you expect (e.g. only `{ code }`).
- Set max length on `express.json()` limit and enforce string length limits in your validators.
- Use schema validation libraries (Zod, Joi, Valibot) for complex inputs.

## Security

- Use `helmet` to set secure HTTP headers (X-Content-Type-Options, X-Frame-Options, etc.).
- Enable CORS with an explicit allowlist — never `*` in production.
- Set `app.set('trust proxy', 1)` when behind a reverse proxy (Docker, Vercel, etc.) to get real client IPs.
- Sanitize user input to prevent NoSQL injection and XSS.
- Never commit secrets — use `.env` files and `process.env` with validation.
- Apply rate limiting per IP or API key to prevent abuse.
- Use HTTPS in production; redirect HTTP to HTTPS.

## Error handling

- Always have a global error-handling middleware (4 arguments: `err, req, res, next`).
- Return generic error messages to the client; log detailed errors server-side.
- Distinguish between operational errors (expected, user-caused) and programming errors (bugs).
- For async routes, wrap handlers in a try/catch or use a utility wrapper — Express 5 handles rejected promises natively.
- Clean up resources (DB connections, file handles, child processes) in error paths and shutdown handlers.

## Performance

- Never block the event loop. Offload CPU-intensive work to worker threads or a separate process.
- Use streaming for large payloads instead of buffering entire files in memory.
- Cache expensive computations or DB results with a sensible TTL.
- Use `connection: keep-alive` and reuse HTTP clients (don't create new connections per request).
- Paginate list endpoints — never return unbounded result sets.

## TypeScript with Express

- Type route parameters, query strings, and request bodies explicitly.
- Use `express.Request`, `express.Response`, `express.NextFunction` types.
- Define typed interfaces for `req.body` instead of using `any` or loose `Record<string, unknown>`.
- Use generics on `Request<P, ResBody, ReqBody>` for full type safety.

## Graceful shutdown

- Listen for `SIGINT` and `SIGTERM` to shut down cleanly.
- Close all open connections (DB, Redis, embedded servers) before exiting.
- Use `process.exit(1)` only after cleanup; use `process.exit(0)` for intentional shutdown.
- Handle `uncaughtException` and `unhandledRejection` to log and exit — don't leave the process in an undefined state.

## Logging

- Use structured logging (JSON) in production — not `console.log` strings.
- Log at appropriate levels: `error` for failures, `warn` for degraded states, `info` for lifecycle events.
- Never log sensitive data: passwords, tokens, API keys, personal information.
- Use a logging library (Pino, Winston) for production; `console` is fine for development.

## Review checklist

- [ ] All input validated and typed before use.
- [ ] Error handling middleware present and used.
- [ ] Secrets not hardcoded or logged.
- [ ] Rate limiting applied to public endpoints.
- [ ] Proper HTTP status codes returned.
- [ ] No blocking operations in async handlers.
- [ ] Graceful shutdown handles all resources.
- [ ] Response bodies don't leak internal details.
