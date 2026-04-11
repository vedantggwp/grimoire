import { defineConfig } from 'vitest/config';

// Vitest defaults to running test files in parallel. Grimoire's three pipeline
// test files (compile.test.ts, serve.test.ts, examples-mcp.smoke.test.ts)
// all invoke the compile script and write to `.compile/` directories — if
// they run concurrently they race on the same filesystem state and produce
// flaky failures (notes.json read mid-write, etc.).
//
// The test-within-a-file sequence is fine; only cross-file parallelism is
// the problem. Disabling fileParallelism keeps the suite fast (~2s total)
// while eliminating the race.
export default defineConfig({
  test: {
    fileParallelism: false,
  },
});
