#!/usr/bin/env node
// Validates the parametric skull generator output (tasks.md H1.1): closed
// manifold, sane triangle budget, outward winding, X symmetry, complete
// landmarks on/inside the mesh. Runs as part of `npm run check`.
import process from 'node:process';
import {
  buildGeneratedHead,
  GENERATED_HEAD_PRESETS,
} from '../src/data/avatar/generated-heads.js';

const REQUIRED_LANDMARKS = ['eyeL', 'eyeR', 'noseTip', 'mouth', 'earL', 'earR', 'hairline', 'crown', 'chin'];
const errors = [];

function checkHead(id, head) {
  const { vertices, faces } = head.customGeometry;
  const label = `head ${id}`;

  if (faces.length < 100 || faces.length > 400) {
    errors.push(`${label}: ${faces.length} triangles (expected 100-400)`);
  }

  // Closed manifold: every undirected edge shared by exactly two faces, and
  // consistent orientation: every directed edge appears exactly once.
  const undirected = new Map();
  const directed = new Set();
  let degenerate = 0;
  faces.forEach((face) => {
    const [a, b, c] = face;
    if (a === b || b === c || a === c) degenerate += 1;
    [[a, b], [b, c], [c, a]].forEach(([u, v]) => {
      const dKey = `${u}>${v}`;
      if (directed.has(dKey)) errors.push(`${label}: duplicated directed edge ${dKey}`);
      directed.add(dKey);
      const uKey = u < v ? `${u}-${v}` : `${v}-${u}`;
      undirected.set(uKey, (undirected.get(uKey) || 0) + 1);
    });
  });
  if (degenerate > 0) errors.push(`${label}: ${degenerate} degenerate faces`);
  undirected.forEach((count, key) => {
    if (count !== 2) errors.push(`${label}: edge ${key} shared by ${count} faces (mesh not closed)`);
  });

  // Outward winding: signed volume must be positive.
  let volume = 0;
  faces.forEach(([a, b, c]) => {
    const [ax, ay, az] = vertices[a];
    const [bx, by, bz] = vertices[b];
    const [cx, cy, cz] = vertices[c];
    volume += (ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)) / 6;
  });
  if (volume <= 0) errors.push(`${label}: signed volume ${volume.toFixed(4)} (winding is inward)`);

  // Canonical box: height 1.2, base at 0, centered.
  let minY = Infinity; let maxY = -Infinity; let minX = Infinity; let maxX = -Infinity;
  vertices.forEach(([x, y]) => {
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
  });
  if (Math.abs(minY) > 1e-6 || Math.abs(maxY - 1.2) > 1e-6) {
    errors.push(`${label}: y range [${minY.toFixed(4)}, ${maxY.toFixed(4)}] (expected [0, 1.2])`);
  }
  if (Math.abs(minX + maxX) > 1e-6) {
    errors.push(`${label}: x bounds not centered (${minX.toFixed(4)}..${maxX.toFixed(4)})`);
  }

  // X symmetry: the multiset of vertices must equal its own mirror.
  const keyOf = ([x, y, z]) => `${x.toFixed(5)},${y.toFixed(5)},${z.toFixed(5)}`;
  const bag = new Set(vertices.map(keyOf));
  vertices.forEach((v) => {
    const mirrored = keyOf([-v[0], v[1], v[2]]);
    if (!bag.has(mirrored)) errors.push(`${label}: vertex ${keyOf(v)} has no X mirror`);
  });

  // Landmarks.
  const landmarks = head.landmarks || {};
  REQUIRED_LANDMARKS.forEach((key) => {
    if (!Array.isArray(landmarks[key])) errors.push(`${label}: missing landmark ${key}`);
  });
  if (landmarks.eyeL && landmarks.eyeR) {
    if (!(landmarks.eyeL[0] < 0 && landmarks.eyeR[0] > 0)) {
      errors.push(`${label}: eyeL.x must be negative and eyeR.x positive`);
    }
    const io = Math.hypot(
      landmarks.eyeR[0] - landmarks.eyeL[0],
      landmarks.eyeR[1] - landmarks.eyeL[1],
      landmarks.eyeR[2] - landmarks.eyeL[2],
    );
    if (io < 0.18 || io > 0.5) errors.push(`${label}: interocular ${io.toFixed(3)} outside 0.18-0.5`);
    if (landmarks.eyeL[2] <= 0) errors.push(`${label}: eyes must sit on the front half (z > 0)`);
  }
  if (landmarks.mouth && landmarks.eyeL && landmarks.mouth[1] >= landmarks.eyeL[1]) {
    errors.push(`${label}: mouth must be below the eye line`);
  }
  Object.entries(landmarks).forEach(([key, [x, y, z]]) => {
    if (y < -1e-6 || y > 1.2 + 1e-6 || Math.abs(x) > 0.7 || Math.abs(z) > 0.7) {
      errors.push(`${label}: landmark ${key} [${x.toFixed(3)}, ${y.toFixed(3)}, ${z.toFixed(3)}] escapes the head box`);
    }
  });
}

GENERATED_HEAD_PRESETS.forEach((preset) => {
  checkHead(preset.id, buildGeneratedHead(preset.spec));
});

// Parameter robustness: extreme corners of the spec space must still produce
// valid closed meshes (sliders will explore this space live).
const extremes = [
  { skullWidth: 0.5, skullDepth: 0.5, jawWidth: 0.35, jawDrop: 0, chinShape: 1, cheekFullness: 0, faceFlatness: 1, crownRoundness: 0, eyeLineHeight: 0.42 },
  { skullWidth: 1.1, skullDepth: 1.05, jawWidth: 0.95, jawDrop: 1, chinShape: 0, cheekFullness: 1, faceFlatness: 0, crownRoundness: 1, eyeLineHeight: 0.6 },
];
extremes.forEach((spec, index) => {
  checkHead(`extreme_${index}`, buildGeneratedHead(spec));
});

if (errors.length > 0) {
  console.error(`Generated head check FAILED (${errors.length} problem${errors.length === 1 ? '' : 's'}):`);
  errors.slice(0, 30).forEach((e) => console.error(`  - ${e}`));
  process.exit(1);
}
console.log(`Generated head check passed (${GENERATED_HEAD_PRESETS.length} presets + ${extremes.length} extremes).`);
