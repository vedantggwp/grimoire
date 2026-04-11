---
title: "The Signals Pattern"
summary: "Signals as a fine-grained reactive primitive: synchronous, glitch-free, auto-tracking, now adopted by Solid, Preact, Angular, and Qwik."
tags: [signals, reactivity, patterns]
sources:
  - url: "https://example.com/signals-pattern"
    title: "Understanding Signals"
    accessed: 2026-04-03
updated: 2026-04-03
confidence: P1
---

# The Signals Pattern

## Overview

Signals are a reactive primitive that represent a value that changes over time. Unlike observables or event emitters, signals are synchronous, glitch-free, and automatically track their dependencies. Multiple frameworks have adopted signals: Solid, Preact, Angular, and Qwik.

## Key Capabilities

- **Fine-grained reactivity** — only the specific DOM nodes that depend on a signal update
- **Automatic dependency tracking** — no manual subscription management
- **Synchronous evaluation** — no batching surprises or timing issues

## How It Works

1. A signal holds a value and a set of subscribers
2. When read inside an effect, the signal registers the effect as a subscriber
3. When the signal's value changes, all subscribers are notified synchronously

```javascript
const count = signal(0);
effect(() => console.log(count.value)); // subscribes automatically
count.value = 1; // triggers the effect
```

## Limitations

- **No standardization** — each framework implements signals differently
- **Memory management** — long-lived signals with many subscribers need cleanup
- **Learning curve** — mental model differs from React's snapshot-based rendering

## See Also

- [[vue-reactivity]] — Vue's Proxy-based system is conceptually similar to signals
