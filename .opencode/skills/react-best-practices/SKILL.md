---
name: react-best-practices
description: Idiomatic React 19 coding with the React Compiler enabled. Use when writing, reviewing, or refactoring React components, JSX, hooks, state management, or event handlers. Reinforces avoiding useEffect, useCallback, useMemo, and memo, and keeping components small.
license: MIT
compatibility: opencode
metadata:
  audience: frontend
  workflow: react
---

# React Best Practices

## Core rules

- Target React 19; assume the React Compiler is enabled.
- NEVER use `useCallback`, `useMemo`, or `memo`. Memoization is the compiler's job — wrapping things anyway is noise and a code smell.
- NEVER add comments that explain obvious code. Code should be self-evident.
- ALWAYS use arrow functions for components: `const App = () => {}` instead of `function App() {}`.
- Cleanup on unmount (intervals, listeners, timers) still happens via `useEffect` cleanup.

## Avoid useEffect as much as possible

Most effects are not effects. Prefer:

- Calling `setState` directly in event handlers.
- Derived values computed during render (e.g. filter a list, build cell classes from state).
- One `useState` holding a single object, updated with functional `setState(...)` so state, score, and flags change together in one render.
- The event body itself (nothing to subscribe to) instead of a `useEffect`.

The only justified `useEffect` is subscribing to an external system (interval, keyboard/window events, resize, WebSocket). Even then: specify deps, and write setup → work → cleanup only, with no business logic.

## Signals → fix table

When you see one of these, apply the fix:

| Signal | Fix |
|---|---|
| Effect syncs state to state | Make it derived state, or reset with a `key` |
| Effect adds a listener / timer | Single effect with cleanup, or handle in the natural callback |
| `useCallback` / `useMemo` / `memo` | Delete; the compiler memoizes |
| Effects chaining `setState` calls | Coalesce into one functional update per interaction |
| Parallel `useState`s changed together | Merge into one state object |
| Toggle/imperative flag that survives render | Derive from render data, not state |

## State updating

- Updates happen in handlers or functional `setState` — never in effects.
- State derived from props at mount time is a trap; derive during render instead.
- When two pieces of state always change together, they're one state.

## Keep components small

- Split any component whose JSX is getting long into smaller presentational components.
- Never paste large JSX blocks. Extract pieces into named components or small render helpers.
- Props flow down, data lives close to where it changes.
- Extract logic that's purely computational into plain functions outside the component — no hooks needed, trivially testable.

## Hooks

- Rules of Hooks: same order every render, no hooks inside conditionals/loops (eslint will catch this).
- Custom hooks should wrap a single behavior and return values the component can use directly.
- `setState(() => ...)` functional form when the new value depends on the current one.

## Checklist

- [ ] No `useCallback`, `useMemo`, or `memo` anywhere.
- [ ] `useEffect` reserved for external subscriptions only; minimal body with cleanup.
- [ ] State updates happen in handlers or functional `setState`, not in effects.
- [ ] Components are small; no oversized JSX.
- [ ] Derived values computed in render, not stored in state.
- [ ] No explanatory comments.