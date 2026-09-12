---
name: react-best-practices
description: Idiomatic React 19 coding with the React Compiler. Use when writing, reviewing, or refactoring React components, JSX, hooks, or state management. Reinforces avoiding useEffect, useCallback, useMemo, and memo, and keeping components small.
---

# React Best Practices

## Core rules

- Target React 19; assume the React Compiler is enabled.
- NEVER use `useCallback`, `useMemo`, or `memo`. Memoization is the compiler's job — wrapping things anyway is noise and a code smell.
- NEVER add comments that explain obvious code. Code should be self-evident.
- ALWAYS use arrow functions for components: `const App = () => {}` instead of `function App() {}`.

## Avoid useEffect as much as possible

Most effects are not effects. Prefer:

- Calling `setState` directly in event handlers.
- Derived values computed during render (e.g. filter a list, build cell classes from state).
- One `useState` holding a single object, updated with functional `setState(...)` so state, score, and flags change together in one render.
- The event body itself (nothing to subscribe to) instead of a `useEffect`.

The only justified `useEffect` is subscribing to an external system (interval, keyboard/window events, resize, WebSocket). Even then: specify deps, and write setup → work → cleanup only, with no business logic.

## Keep components small

- Split any component whose JSX is getting long into smaller presentational components.
- Never paste large JSX blocks. Extract pieces into named components or small render helpers.
- Props flow down, data lives close to where it changes.

## Anti-pattern patterns

- `useEffect` syncing state to state → use derived state or a `key` to reset.
- `useEffect` for event listeners → single effect with cleanup, or handle in the natural callback.
- `useCallback`/`useMemo`/`memo` → delete; the compiler memoizes automatically.
- Effects that chain `setState` calls → coalesce into one functional update per interaction.
- Parallel `useState`s for data that changes together → merge into one state object.

## Review checklist

- [ ] No `useCallback`, `useMemo`, or `memo` anywhere.
- [ ] `useEffect` reserved for external subscriptions only; minimal body with cleanup.
- [ ] State updates happen in handlers or functional `setState`, not in effects.
- [ ] Components are small; no oversized JSX.
- [ ] No explanatory comments.