/**
 * present — Build-time layout computation
 *
 * Two deterministic layouts computed in Node so the generated pages ship
 * data instead of layout engines:
 *
 * - Force layout: spring + repulsion over the knowledge graph, seeded from
 *   a slug hash (no randomness — identical inputs produce identical sites,
 *   which the resume/diff story depends on). Feeds the hub constellation
 *   and warm-starts graph mode.
 * - Squarified treemap: replaces the ~270KB inlined d3 in gaps mode with
 *   absolutely-positioned percentage rectangles.
 */

export interface LayoutNode {
  readonly id: string;
  readonly label: string;
  /** Normalized 0..1 */
  readonly x: number;
  readonly y: number;
  /** Normalized radius (fraction of min canvas dimension) */
  readonly r: number;
  readonly weight: number;
}

export interface LayoutEdge {
  readonly source: string;
  readonly target: string;
}

interface ForceInput {
  readonly id: string;
  readonly label: string;
  /** Relative size driver (word count, link count …) */
  readonly weight: number;
}

// FNV-1a — cheap deterministic hash for seeding initial positions.
function hash(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) / 0xffffffff;
}

const TICKS = 200;
const REPULSION = 0.0035;
const SPRING = 0.015;
const SPRING_LENGTH = 0.22;
const CENTER_PULL = 0.012;
const DAMPING = 0.85;
const PADDING = 0.08;

export function computeForceLayout(
  nodes: readonly ForceInput[],
  edges: readonly LayoutEdge[],
  maxNodes = 80,
): readonly LayoutNode[] {
  if (nodes.length === 0) return [];

  // Cap to the heaviest nodes so huge wikis stay cheap to draw.
  const kept = [...nodes]
    .sort((a, b) => b.weight - a.weight || a.id.localeCompare(b.id))
    .slice(0, maxNodes);
  const keptIds = new Set(kept.map(n => n.id));
  const keptEdges = edges.filter(e => keptIds.has(e.source) && keptIds.has(e.target));

  if (kept.length === 1) {
    return [{ id: kept[0].id, label: kept[0].label, x: 0.5, y: 0.5, r: 0.05, weight: kept[0].weight }];
  }

  // Seeded ring start: angle and radius from the slug hash.
  const xs = kept.map(n => 0.5 + 0.35 * Math.cos(hash(n.id) * Math.PI * 2) * (0.5 + hash(`${n.id}r`) * 0.5));
  const ys = kept.map(n => 0.5 + 0.35 * Math.sin(hash(n.id) * Math.PI * 2) * (0.5 + hash(`${n.id}r`) * 0.5));
  const vx = kept.map(() => 0);
  const vy = kept.map(() => 0);

  const index = new Map(kept.map((n, i) => [n.id, i]));
  const edgePairs = keptEdges.map(e => [index.get(e.source)!, index.get(e.target)!] as const);

  for (let tick = 0; tick < TICKS; tick += 1) {
    // Repulsion (inverse square, clamped)
    for (let i = 0; i < kept.length; i += 1) {
      for (let j = i + 1; j < kept.length; j += 1) {
        const dx = xs[i] - xs[j];
        const dy = ys[i] - ys[j];
        const distSq = Math.max(dx * dx + dy * dy, 0.0004);
        const force = REPULSION / distSq;
        const dist = Math.sqrt(distSq);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        vx[i] += fx; vy[i] += fy;
        vx[j] -= fx; vy[j] -= fy;
      }
    }

    // Springs along edges
    for (const [i, j] of edgePairs) {
      const dx = xs[j] - xs[i];
      const dy = ys[j] - ys[i];
      const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 0.001);
      const force = SPRING * (dist - SPRING_LENGTH);
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      vx[i] += fx; vy[i] += fy;
      vx[j] -= fx; vy[j] -= fy;
    }

    // Gentle center gravity + integrate
    for (let i = 0; i < kept.length; i += 1) {
      vx[i] += (0.5 - xs[i]) * CENTER_PULL;
      vy[i] += (0.5 - ys[i]) * CENTER_PULL;
      vx[i] *= DAMPING;
      vy[i] *= DAMPING;
      xs[i] += vx[i];
      ys[i] += vy[i];
    }
  }

  // Normalize into the padded unit square.
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = Math.max(maxX - minX, 0.001);
  const spanY = Math.max(maxY - minY, 0.001);

  const maxWeight = Math.max(...kept.map(n => n.weight), 1);

  return kept.map((n, i) => ({
    id: n.id,
    label: n.label,
    x: PADDING + ((xs[i] - minX) / spanX) * (1 - PADDING * 2),
    y: PADDING + ((ys[i] - minY) / spanY) * (1 - PADDING * 2),
    r: 0.008 + 0.022 * Math.sqrt(n.weight / maxWeight),
    weight: n.weight,
  }));
}

// --- Squarified treemap (Bruls, Huizing, van Wijk) ---

export interface TreemapInput {
  readonly id: string;
  readonly value: number;
}

export interface TreemapRect {
  readonly id: string;
  /** Percentages 0..100 relative to the container */
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

function worstRatio(row: readonly number[], side: number): number {
  const sum = row.reduce((a, b) => a + b, 0);
  const max = Math.max(...row);
  const min = Math.min(...row);
  const sideSq = side * side;
  const sumSq = sum * sum;
  return Math.max((sideSq * max) / sumSq, sumSq / (sideSq * min));
}

export function squarifiedTreemap(
  items: readonly TreemapInput[],
  width = 100,
  height = 100,
): readonly TreemapRect[] {
  const positive = items.filter(i => i.value > 0);
  if (positive.length === 0) return [];

  const total = positive.reduce((sum, i) => sum + i.value, 0);
  const area = width * height;
  const scaled = [...positive]
    .sort((a, b) => b.value - a.value || a.id.localeCompare(b.id))
    .map(i => ({ id: i.id, area: (i.value / total) * area }));

  const rects: TreemapRect[] = [];
  let x = 0;
  let y = 0;
  let w = width;
  let h = height;
  let row: { id: string; area: number }[] = [];

  const layoutRow = (): void => {
    const side = Math.min(w, h);
    const rowArea = row.reduce((sum, r) => sum + r.area, 0);
    const thickness = rowArea / side;
    let offset = 0;

    for (const item of row) {
      const length = item.area / thickness;
      if (w >= h) {
        rects.push({ id: item.id, left: x, top: y + offset, width: thickness, height: length });
      } else {
        rects.push({ id: item.id, left: x + offset, top: y, width: length, height: thickness });
      }
      offset += length;
    }

    if (w >= h) {
      x += thickness;
      w -= thickness;
    } else {
      y += thickness;
      h -= thickness;
    }
    row = [];
  };

  for (const item of scaled) {
    const side = Math.min(w, h);
    const current = row.map(r => r.area);
    if (
      row.length === 0 ||
      worstRatio([...current, item.area], side) <= worstRatio(current, side)
    ) {
      row.push(item);
    } else {
      layoutRow();
      row.push(item);
    }
  }
  if (row.length > 0) layoutRow();

  // Round to 3 decimals for compact HTML output.
  return rects.map(r => ({
    id: r.id,
    left: Number(r.left.toFixed(3)),
    top: Number(r.top.toFixed(3)),
    width: Number(r.width.toFixed(3)),
    height: Number(r.height.toFixed(3)),
  }));
}
