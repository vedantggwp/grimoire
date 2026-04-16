import { describe, it, expect } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { inferSchemaFromPrompt, detectClaudeMd } from '../lib/defaults';

describe('inferSchemaFromPrompt', () => {
  it('classifies advanced audience from "engineers" keyword', () => {
    const result = inferSchemaFromPrompt('WebGPU for engineers building compute shaders');
    expect(result.topic).toBe('WebGPU for engineers building compute shaders');
    expect(result.audience).toBe('engineers/developers');
    expect(result.level).toBe('advanced');
  });

  it('defaults to intermediate/practitioners when no audience hint', () => {
    const result = inferSchemaFromPrompt('reinforcement learning from human feedback');
    expect(result.audience).toBe('practitioners');
    expect(result.level).toBe('intermediate');
  });

  it('classifies beginner audience from "beginners" keyword', () => {
    const result = inferSchemaFromPrompt('React basics for beginners');
    expect(result.audience).toBe('learners');
    expect(result.level).toBe('beginner');
  });

  it('handles single-word topic with default audience', () => {
    const result = inferSchemaFromPrompt('CRDTs');
    expect(result.topic).toBe('CRDTs');
    expect(result.audience).toBe('practitioners');
    expect(result.level).toBe('intermediate');
  });

  it('trims whitespace from topic', () => {
    const result = inferSchemaFromPrompt('  WebGPU  ');
    expect(result.topic).toBe('WebGPU');
  });

  it('strips surrounding quotes from topic', () => {
    const result = inferSchemaFromPrompt('"quoted topic"');
    expect(result.topic).toBe('quoted topic');
  });

  it('classifies advanced from "advanced" keyword', () => {
    const result = inferSchemaFromPrompt('advanced distributed systems architecture');
    expect(result.audience).toBe('engineers/developers');
    expect(result.level).toBe('advanced');
  });

  it('classifies beginner from "intro" keyword', () => {
    const result = inferSchemaFromPrompt('intro to machine learning');
    expect(result.audience).toBe('learners');
    expect(result.level).toBe('beginner');
  });

  it('classifies beginner from "getting started" keyword', () => {
    const result = inferSchemaFromPrompt('getting started with Rust');
    expect(result.audience).toBe('learners');
    expect(result.level).toBe('beginner');
  });

  it('classifies advanced from "senior" keyword', () => {
    const result = inferSchemaFromPrompt('Kubernetes for senior platform engineers');
    expect(result.audience).toBe('engineers/developers');
    expect(result.level).toBe('advanced');
  });

  it('sets scope based on cleaned topic', () => {
    const result = inferSchemaFromPrompt('  WebGPU  ');
    expect(result.scope.in).toBe('All aspects of WebGPU');
    expect(result.scope.out).toBe('Topics unrelated to WebGPU');
  });

  it('always returns emergent taxonomy', () => {
    const result = inferSchemaFromPrompt('anything');
    expect(result.taxonomy).toBe('emergent');
  });

  it('always returns linear-editorial palette and typography', () => {
    const result = inferSchemaFromPrompt('anything');
    expect(result.palette).toBe('linear-editorial');
    expect(result.typography).toBe('linear-editorial');
  });

  it('always returns null claudeMdPath', () => {
    const result = inferSchemaFromPrompt('anything');
    expect(result.claudeMdPath).toBeNull();
  });
});

describe('detectClaudeMd', () => {
  const testDir = join(tmpdir(), `grimoire-test-${Date.now()}`);

  it('returns absolute path when CLAUDE.md exists', () => {
    const withClaudeMd = join(testDir, 'with-claude');
    mkdirSync(withClaudeMd, { recursive: true });
    writeFileSync(join(withClaudeMd, 'CLAUDE.md'), '# Test');

    const result = detectClaudeMd(withClaudeMd);
    expect(result).toBe(join(withClaudeMd, 'CLAUDE.md'));

    rmSync(withClaudeMd, { recursive: true });
  });

  it('returns null when CLAUDE.md does not exist', () => {
    const withoutClaudeMd = join(testDir, 'without-claude');
    mkdirSync(withoutClaudeMd, { recursive: true });

    const result = detectClaudeMd(withoutClaudeMd);
    expect(result).toBeNull();

    rmSync(withoutClaudeMd, { recursive: true });
  });
});
