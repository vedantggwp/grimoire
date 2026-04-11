---
title: "Vue Reactivity System"
summary: "How Vue uses JavaScript Proxies to transparently track dependencies and trigger updates without explicit state management."
tags: [vue, reactivity, proxy]
sources:
  - url: "https://vuejs.org/guide/essentials/reactivity-fundamentals.html"
    title: "Vue Reactivity Fundamentals"
    accessed: 2026-04-01
updated: 2026-04-01
confidence: P1
---

# Vue Reactivity System

## Overview

Vue's reactivity system uses JavaScript Proxies to track dependencies and trigger updates automatically. Unlike React's explicit state management, Vue's approach is implicit — mutations are tracked transparently.

## Key Capabilities

- **Proxy-based tracking** — automatic dependency detection without explicit declarations
- **Computed properties** — derived values that cache and update efficiently
- **Watch effects** — side effects that re-run when dependencies change

## How It Works

1. `reactive()` wraps objects in a Proxy that intercepts get/set operations
2. During render, accessed properties are recorded as dependencies
3. When a dependency changes, all dependent effects re-run

```javascript
const state = reactive({ count: 0 });
watchEffect(() => console.log(state.count)); // re-runs on change
state.count++; // triggers the effect
```

## Limitations

- **Proxy limitations** — cannot track destructured primitives from reactive objects
- **Ref unwrapping** — `.value` requirement for refs adds cognitive overhead
- **Deep reactivity** — large nested objects can have performance implications

## See Also

- [[react-fundamentals]] — React's explicit state management approach
- [[signals-pattern]] — the emerging signals pattern used by newer frameworks
