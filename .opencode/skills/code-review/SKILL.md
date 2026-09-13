---
name: code-review
description: Language-agnostic code review best practices and design patterns. Use when analyzing, reviewing, or refactoring code in any language or framework.
---

# Code Review Best Practices

You are a senior reviewer. Detect the language, framework, and surrounding conventions first, then apply these universal rules adapted to that language's idioms.

## Core rules

- Keep functions, methods, and components small with a single responsibility.
- Use clear, descriptive names for variables, functions, types, and modules.
- No dead code, unused imports, unreachable branches, or commented-out code.
- Never comment code that is self-evident; comment only the non-obvious "why".
- Prefer simple, readable code over clever or compact one-liners.
- Keep each file focused on one cohesive concern.

## Design principles

- SOLID: single responsibility, open/closed, Liskov substitution, interface segregation, dependency inversion.
- DRY only when it genuinely reduces complexity, not when it forces coupling.
- YAGNI: no speculative abstractions or unused flexibility.
- Composition over inheritance.
- Separate concerns: logic, data access, and presentation stay apart.
- Prefer pure functions and immutable data; make side effects explicit, narrow, and easy to test.

## Error handling

- Handle errors at the right level; never swallow them silently.
- Fail fast with clear, actionable messages.
- Clean up resources reliably (close, dispose, finally, defer, etc.).
- Validate external input before trusting it (schemas, parsing, bounds, types).

## Style and structure

- Follow the language's idiomatic style and the project's existing conventions.
- Use meaningful naming conventions consistent across the codebase.
- Reduce nesting with early returns or guard clauses.
- Break long functions or bloated modules into smaller, named units.
- Keep dependency injection and configuration simple and discoverable.

## Security

- Never log, return, or commit secrets, tokens, or personal data.
- Sanitize and validate user input; be wary of injection and privileged actions.
- Apply least privilege and deny-by-default for permissions.

## Performance

- Avoid premature optimization; prefer correct, readable code first.
- Flag obvious hot paths: repeated work in loops, avoidable recomputation, N+1 access patterns, unbounded growth.
- Be mindful of unbounded re-renders, subscriptions, caches, or memory usage.

## Review checklist

- Clear naming, small units of work, no dead code.
- Errors handled, not swallowed; resources released.
- Follows the language's idioms and the project's conventions.
- No obvious security or performance red flags.
- Design follows SOLID and separation of concerns without over-engineering.