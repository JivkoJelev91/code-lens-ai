---
name: scss-best-practices
description: SCSS/Sass best practices for Vue 3, React, and Vite projects using CSS Modules or plain SCSS. Use when writing, reviewing, or refactoring .scss files, styles directory structure, design tokens, CSS custom properties, mixins, or nested selectors.
license: MIT
compatibility: opencode, vue, vite
metadata:
  audience: frontend
  workflow: styling
---

# SCSS / Sass Best Practices

## Locate the system first

Before editing styles, check how the project already structures them:

- Is SCSS used with CSS Modules (`.module.scss`), plain SCSS, or global styles?
- Where are design tokens defined (often `:root` CSS custom properties)?
- Which `@use`s already exist — don't re-declare mixins that are available.

## Token system: CSS custom properties, not SCSS vars

- Put design tokens (colors, spacing, radii, fonts, z-index) in CSS custom properties on `:root` — not SCSS variables — so they're runtime-swappable and scoped.

```scss
:root {
  --color-accent: #00ff41;
  --color-accent-faint: rgba(0, 255, 65, 0.04);
  --space-1: 4px;
  --radius-md: 6px;
}
```

- Reference tokens as `var(--token)` in components; reserve SCSS variables for compile-time math and shared values that never change at runtime.
- Keep a single source of truth per value. If a color appears in multiple files, that's a token to add.

## Use `@use`, never `@import`

- `@import` is deprecated and will be removed. Use `@use` with explicit namespacing:

```scss
// _mixins.scss (partial, underscore = shared, not compiled standalone)
@use 'styles/mixins' as m;

.card {
  @include m.flex-column(8px);
}
```

- Import only the members you need: `@use 'styles/mixins' as *;` only when the names can't collide.

## Nesting

- Cap nesting at 2–3 levels; deeper nesting means a selector problem.
- Flatten one-in-one-out wrappers (`& > * > *`) — give classes, don't descend arbitrarily.
- Prefer `&` for the current parent (pseudo-state, modifier) — that's its job, abusing deeper nests is not.

```scss
// good
.button {
  &:hover { color: var(--color-accent); }
  &.is-active { background: var(--color-accent); }
}

// bad — 4 levels of descent
.list { .item { .header { .title { color: red; } } } }
```

## Grouping and structure

- Keep related rules together: position, box model, typography, color, then state (`&:hover`, media queries last).
- One stylesheet per component, co-located next to it (e.g. `Component.module.scss` next to `Component.tsx`).
- Shared, reusable utilities (mixins, token partials) live in a `styles/` folder; do not duplicate them across components.
- Use `@if`/`@each`/`@function` for generator-style code only when it removes real repetition — not for single-use abstraction.

## Mix-ins and placeholders

- Use `@mixin` when you mix in properties with arguments (a flexbox pattern, an ellipsis, a media query).
- Use `%placeholder` + `@extend` only for shared static rules with no arguments (avoids duplicating the rule in output).
- Keep mixins small and composable; one mixin == one intent (`flex-column`), never a "everything" mixin.

## CSS Modules specifics

- Import styles and use camelCase keys — SCSS Modules export kebab-case as camelCase, so watch class names:

```tsx
import styles from './Card.module.scss';
<div className={styles.cardHeader} />  // styles['card-header'] also works
```

- Global/reset selectors inside a module need explicit escaping: `:global(.monaco-editor) { ... }`.
- Reuse a style from another module with `composes: base from './Base.module.scss';` instead of duplicating rules.
- Don't use `:global` to leak component styles into the whole page — that's what the global stylesheet is for.

## Responsive design

- Mobile-first: base styles unqualified, `@media (min-width: ...)` scopes up.
- Breakpoint values should be tokens, and prefer `@include`d media mixins so the project-wide query set stays consistent.

## Avoid

- `!important` — each one hides a specificity problem; fix the selector instead.
- Magic numbers — name the intent with a token or a 4px-8px spacing rhythm.
- `#id` selectors and heavy global element selectors for component styling.
- `@extend` chains that cross component boundaries (creates implicit coupling).
- Inline styles in JSX when the same concern belongs to the stylesheet.

## Checklist

- [ ] Design tokens live in `:root` custom properties, not scattered SCSS vars.
- [ ] `@use` everywhere; zero `@import`.
- [ ] Nesting ≤ 3 levels; state via `&`.
- [ ] One component stylesheet, co-located; shared code in `styles/`.
- [ ] No `!important`, no magic numbers, no id selectors.
- [ ] CSS Modules classes accessed via camelCase keys; `:global` only for escapes.