---
title: "Svelte Compilation Model"
summary: "How Svelte's compile-time transformation eliminates the virtual DOM and ships minimal runtime code by generating imperative DOM updates."
tags: [svelte, compiler, reactivity]
sources:
  - url: "https://svelte.dev/docs"
    title: "Svelte Documentation"
    accessed: 2026-04-02
updated: 2026-04-02
confidence: P1
---

# Svelte Compilation Model

## Overview

Svelte is a compiler that transforms declarative component code into imperative JavaScript that directly manipulates the DOM. Unlike React and Vue, there is no runtime framework — the compiler generates optimized update code at build time.

## Key Capabilities

- **No virtual DOM** — compile-time analysis eliminates the need for diffing
- **Minimal runtime** — generated code is small and framework-free
- **Reactive assignments** — `$:` syntax triggers updates on assignment

## How It Works

1. Svelte analyzes component code at compile time
2. It generates imperative DOM manipulation code for each reactive statement
3. The output is vanilla JavaScript with no framework dependency

```svelte
<script>
  let count = 0;
  $: doubled = count * 2;
</script>

<button on:click={() => count++}>
  {count} (doubled: {doubled})
</button>
```

## Limitations

- **Ecosystem size** — smaller community and fewer third-party libraries
- **Tooling dependency** — requires the Svelte compiler in the build pipeline
- **Debugging** — compiled output differs from source, complicating debugging

## See Also

- [[react-fundamentals]] — React's virtual DOM approach for comparison
