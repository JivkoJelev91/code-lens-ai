---
name: code-review
description: Language-agnostic code review, refactoring, and design analysis in any language or framework. Use when asked to review code or a pull request, find bugs, judge code quality, refactor for maintainability, or answer "is this code good?".
license: MIT
compatibility: opencode
metadata:
  audience: maintainers
  workflow: review
---

# Code Review Best Practices

You are a senior reviewer. Detect the language, framework, and surrounding conventions first, then adapt these universal rules to that language's idioms. Never write code unless asked — review, explain, and suggest.

## Review process

1. Read the whole diff/file before judging any part; isolated lines look worse than they are.
2. Classify each finding by severity (below) so the author can triage.
3. Point at the exact symptom, explain why it's wrong, give a concrete fix. "This is bad" is useless without the fix.
4. Distinguish style nits from real defects. Don't block merges on taste.
5. Lead with the few things that matter; empty praise and nit counts dilute signals.

### Severity levels

- `critical` — security hole, data loss, crashes, silently wrong results. Blocks merge.
- `major` — bug in a real path, resource leak, N+1/perf landmine, design that guarantees future breakage.
- `minor` — edge-case bug, inconsistent behavior, missed boundary case.
- `nit` — style, naming, formatting. Optional; say "nit" and move on.

## Core rules

- Keep functions, methods, and components small with a single responsibility.
- Clear, descriptive names for variables, functions, types, and modules.
- No dead code, unused imports, unreachable branches, or commented-out code.
- Never comment code that is self-evident; comment only the non-obvious "why".
- Prefer simple, readable code over clever or compact one-liners.
- Keep each file focused on one cohesive concern.

## Design principles

- SOLID: single responsibility, open/closed, Liskov substitution, interface segregation, dependency inversion.
- DRY only when it genuinely reduces complexity, not when it forces coupling.
- YAGNI: no speculative abstractions or unused flexibility.
- Composition over inheritance.
- Keep logic, data access, and presentation apart.
- Prefer pure functions and immutable data; make side effects explicit, narrow, and easy to test.

## Error handling

- Handle errors at the right level; never swallow them silently.
- Fail fast with clear, actionable messages.
- Clean up resources reliably (close, dispose, finally, defer, etc.).
- Validate external input before trusting it (schemas, parsing, bounds, types).

## Style and structure

- Follow the language's idiomatic style and the project's existing conventions.
- Consistent naming conventions across the codebase.
- Reduce nesting with early returns or guard clauses.
- Break long functions or bloated modules into smaller, named units.

## Security

- Never log, return, or commit secrets, tokens, or personal data.
- Sanitize and validate user input; be wary of injection and privileged actions.
- Apply least privilege and deny-by-default for permissions.

## Performance

- Flag obvious hot paths: repeated work in loops, avoidable recomputation, N+1 access patterns, unbounded growth.
- Avoid premature optimization; prefer correct, readable code first.
- Watch for unbounded re-renders, subscriptions, caches, or memory usage.

## Output format

For a full review, group findings by severity and give each an issue entry:

- **Severity** — file:line, one-sentence symptom, one-line fix.
- Keep the total tight; bullet-style, not essays.

## Checklist

- [ ] Clear naming, small units of work, no dead code.
- [ ] Errors handled, not swallowed; resources released.
- [ ] Follows the language's idioms and the project's conventions.
- [ ] No obvious security or performance red flags.
- [ ] SOLID and separation of concerns without over-engineering.