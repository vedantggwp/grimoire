import { describe, expect, it } from 'vitest';

import { computeForceLayout, squarifiedTreemap } from '../lib/present/layout.js';

const NODES = [
  { id: 'alpha', label: 'Alpha', weight: 10 },
  { id: 'beta', label: 'Beta', weight: 6 },
  { id: 'gamma', label: 'Gamma', weight: 3 },
  { id: 'delta', label: 'Delta', weight: 1 },
];
const EDGES = [
  { source: 'alpha', target: 'beta' },
  { source: 'beta', target: 'gamma' },
];

describe('force layout', () => {
  it('is deterministic — identical inputs, identical positions', () => {
    const a = computeForceLayout(NODES, EDGES);
    const b = computeForceLayout(NODES, EDGES);
    expect(a).toEqual(b);
  });

  it('keeps every node inside the padded unit square', () => {
    const layout = computeForceLayout(NODES, EDGES);
    for (const node of layout) {
      expect(node.x).toBeGreaterThanOrEqual(0.05);
      expect(node.x).toBeLessThanOrEqual(0.95);
      expect(node.y).toBeGreaterThanOrEqual(0.05);
      expect(node.y).toBeLessThanOrEqual(0.95);
      expect(node.r).toBeGreaterThan(0);
    }
  });

  it('orders output by weight so the renderer can glow the top 3', () => {
    const layout = computeForceLayout(NODES, EDGES);
    expect(layout.map(n => n.id)).toEqual(['alpha', 'beta', 'gamma', 'delta']);
  });

  it('caps node count and drops edges to cut nodes', () => {
    const many = Array.from({ length: 120 }, (_, i) => ({
      id: `n${i}`,
      label: `N${i}`,
      weight: 120 - i,
    }));
    const layout = computeForceLayout(many, [], 80);
    expect(layout).toHaveLength(80);
  });

  it('handles empty and single-node graphs', () => {
    expect(computeForceLayout([], [])).toEqual([]);
    const single = computeForceLayout([NODES[0]], []);
    expect(single).toHaveLength(1);
    expect(single[0].x).toBe(0.5);
  });
});

describe('squarified treemap', () => {
  const ITEMS = [
    { id: 'a', value: 6 },
    { id: 'b', value: 4 },
    { id: 'c', value: 3 },
    { id: 'd', value: 2 },
    { id: 'e', value: 1 },
  ];

  it('areas sum to the container area', () => {
    const rects = squarifiedTreemap(ITEMS);
    const total = rects.reduce((sum, r) => sum + r.width * r.height, 0);
    expect(total).toBeCloseTo(100 * 100, -1);
  });

  it('rect areas are proportional to values', () => {
    const rects = squarifiedTreemap(ITEMS);
    const a = rects.find(r => r.id === 'a')!;
    const e = rects.find(r => r.id === 'e')!;
    const ratio = (a.width * a.height) / (e.width * e.height);
    expect(ratio).toBeCloseTo(6, 0);
  });

  it('no rect overlaps another', () => {
    const rects = squarifiedTreemap(ITEMS);
    for (let i = 0; i < rects.length; i += 1) {
      for (let j = i + 1; j < rects.length; j += 1) {
        const a = rects[i];
        const b = rects[j];
        const overlapX = Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left);
        const overlapY = Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top);
        const overlap = overlapX > 0.01 && overlapY > 0.01;
        expect(overlap, `${a.id} overlaps ${b.id}`).toBe(false);
      }
    }
  });

  it('every rect stays inside the container', () => {
    for (const r of squarifiedTreemap(ITEMS)) {
      expect(r.left).toBeGreaterThanOrEqual(0);
      expect(r.top).toBeGreaterThanOrEqual(0);
      expect(r.left + r.width).toBeLessThanOrEqual(100.01);
      expect(r.top + r.height).toBeLessThanOrEqual(100.01);
    }
  });

  it('is deterministic and drops zero-value items', () => {
    const withZero = [...ITEMS, { id: 'z', value: 0 }];
    const a = squarifiedTreemap(withZero);
    const b = squarifiedTreemap(withZero);
    expect(a).toEqual(b);
    expect(a.find(r => r.id === 'z')).toBeUndefined();
  });
});
