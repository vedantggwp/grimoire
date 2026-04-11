---
title: "React Fundamentals"
summary: "How React builds user interfaces through composable components, a virtual DOM, and JSX for declarative UI description."
tags: [react, components, jsx]
sources:
  - url: "https://react.dev"
    title: "React Documentation"
    accessed: 2026-04-01
updated: 2026-04-01
confidence: P0
---

# React Fundamentals

## Overview

React is a JavaScript library for building user interfaces through composable components. It uses a virtual DOM for efficient updates and JSX for declarative UI description.

## Key Capabilities

- **Component model** — encapsulate UI and logic into reusable units
- **Virtual DOM** — diff-based rendering minimizes actual DOM operations
- **Hooks** — functional composition for state and side effects

## How It Works

1. Components return JSX describing the UI
2. React reconciles the virtual DOM with the actual DOM
3. Only changed nodes are updated in the browser

## Usage Examples

### Example: Counter Component

```jsx
function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

## Limitations

- **Re-render cascades** — parent re-renders trigger child re-renders unless memoized
- **Bundle size** — React + ReactDOM adds ~40KB gzipped baseline
- **Learning curve** — hooks rules and closure behavior confuse newcomers

## See Also

- [[vue-reactivity]] — Vue's alternative approach to reactivity
- [[svelte-compilation]] — Svelte's compile-time approach eliminates the virtual DOM
- [[nonexistent-article]] — this link is intentionally broken for testing
