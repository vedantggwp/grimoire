# Graph Visualization Libraries — Reference

## Option A: Quartz Stack (D3 + PixiJS)

**Used by:** Quartz (11K stars)
**License:** D3 = ISC, PixiJS = MIT

```
D3.js v7 → force simulation (physics)
PixiJS v8 → WebGL rendering (drawing)
Tween.js → smooth animations
```

**Pros:** Battle-tested in Quartz, handles large graphs via WebGL, configurable forces.
**Cons:** Two libraries to coordinate. PixiJS is heavy (~500KB).

## Option B: react-force-graph

**Repo:** `vasturiano/react-force-graph` — 3,060 stars, MIT
**Variants:** 2D (canvas), 3D (Three.js), VR, AR

```typescript
import ForceGraph2D from 'react-force-graph-2d';

<ForceGraph2D
  graphData={{ nodes, links }}
  nodeLabel="title"
  onNodeClick={node => navigate(node.slug)}
  linkDirectionalArrowLength={3.5}
/>
```

**Pros:** Single dependency, React-native, 2D/3D options.
**Cons:** React dependency. May be heavier than needed for static output.

## Option C: force-graph (vanilla)

**Repo:** `vasturiano/force-graph` — 1,985 stars, MIT
**No framework dependency.** Canvas-based.

```typescript
import ForceGraph from 'force-graph';

ForceGraph()(document.getElementById('graph'))
  .graphData({ nodes, links })
  .nodeLabel('title')
  .onNodeClick(node => navigate(node.slug));
```

**Pros:** Lightest weight, no framework lock-in, canvas rendering.
**Cons:** Less battle-tested than Quartz stack.

## Option D: 3d-force-graph

**Repo:** `vasturiano/3d-force-graph` — 5,943 stars, MIT
Three.js + WebGL. Immersive 3D exploration.

**Probably overkill for a study wiki.** But visually impressive for demos.

## Recommendation

For Grimoire's static, framework-free frontend: **Option C (force-graph)**. Vanilla JS, canvas, MIT, lightest footprint. If we go React later, upgrade to Option B.

For the Quartz-style "just works" path: **Option A**. Proven at scale, but heavier.
