// Derives 3D facial landmarks for each avatar head mesh and renders
// front/profile SVG previews so the proposals can be verified visually.
//
// Usage:
//   node scripts/derive-head-landmarks.mjs            # preview only (writes .tmp-head-views/)
//   node scripts/derive-head-landmarks.mjs --write    # also writes landmarks + axes into each head JSON
//
// Landmarks are emitted in the head's own authoring space (the same space as
// the `vertices` stored in the JSON), so authors and LLMs can edit them with
// the same numbers they see in the file. The runtime converts them alongside
// the vertices.

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const HEADS_DIR = path.join(ROOT, 'src', 'data', 'avatar', 'heads');
const OUT_DIR = path.join(ROOT, '.tmp-head-views');

// Per-file axis conventions, validated against the runtime pipeline:
// - white_mesh180 was authored Z-up with the face toward -Y.
// - the remaining heads come straight from GLB (Y-up, face toward +Z).
const HEAD_FILES = [
  { file: 'white_mesh180.json', axes: { up: '+z', front: '-y' } },
  { file: 'normal175.json', axes: { up: '+y', front: '+z' } },
  { file: 'cabezon175.json', axes: { up: '+y', front: '+z' } },
  { file: 'duro175.json', axes: { up: '+y', front: '+z' } },
  { file: 'duro250.json', axes: { up: '+y', front: '+z' } },
  { file: 'gordo175.json', axes: { up: '+y', front: '+z' } },
  { file: 'gordo275.json', axes: { up: '+y', front: '+z' } },
];

const WRITE = process.argv.includes('--write');

function toCanonical(vertex, axes) {
  const [x, y, z] = vertex;
  if (axes.up === '+z' && axes.front === '-y') return [x, z, -y];
  if (axes.up === '+y' && axes.front === '+z') return [x, y, z];
  throw new Error(`Unsupported axes ${JSON.stringify(axes)}`);
}

function fromCanonical(vertex, axes) {
  const [x, y, z] = vertex;
  if (axes.up === '+z' && axes.front === '-y') return [x, -z, y];
  if (axes.up === '+y' && axes.front === '+z') return [x, y, z];
  throw new Error(`Unsupported axes ${JSON.stringify(axes)}`);
}

function computeBounds(vertices) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  vertices.forEach((v) => {
    for (let i = 0; i < 3; i++) {
      min[i] = Math.min(min[i], v[i]);
      max[i] = Math.max(max[i], v[i]);
    }
  });
  return { min, max, size: [max[0] - min[0], max[1] - min[1], max[2] - min[2]] };
}

// Möller–Trumbore, ray fixed along -Z from far +Z.
function raycastFrontZ(vertices, faces, x, y) {
  const origin = [x, y, 1e6];
  const dir = [0, 0, -1];
  let best = null;
  faces.forEach((face) => {
    const a = vertices[face[0]];
    const b = vertices[face[1]];
    const c = vertices[face[2]];
    if (!a || !b || !c) return;
    const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const p = [dir[1] * e2[2] - dir[2] * e2[1], dir[2] * e2[0] - dir[0] * e2[2], dir[0] * e2[1] - dir[1] * e2[0]];
    const det = e1[0] * p[0] + e1[1] * p[1] + e1[2] * p[2];
    if (Math.abs(det) < 1e-12) return;
    const inv = 1 / det;
    const tv = [origin[0] - a[0], origin[1] - a[1], origin[2] - a[2]];
    const u = (tv[0] * p[0] + tv[1] * p[1] + tv[2] * p[2]) * inv;
    if (u < -1e-6 || u > 1 + 1e-6) return;
    const q = [tv[1] * e1[2] - tv[2] * e1[1], tv[2] * e1[0] - tv[0] * e1[2], tv[0] * e1[1] - tv[1] * e1[0]];
    const v = (dir[0] * q[0] + dir[1] * q[1] + dir[2] * q[2]) * inv;
    if (v < -1e-6 || u + v > 1 + 1e-6) return;
    const t = (e2[0] * q[0] + e2[1] * q[1] + e2[2] * q[2]) * inv;
    if (t <= 0) return;
    const hitZ = origin[2] - t;
    if (best === null || hitZ > best) best = hitZ;
  });
  return best;
}

function frontSurfacePoint(vertices, faces, bounds, x, y, fallbackZRatio = 0.8) {
  const hit = raycastFrontZ(vertices, faces, x, y);
  const z = hit !== null ? hit : bounds.min[2] + bounds.size[2] * fallbackZRatio;
  return [x, y, z];
}

function pickEarVertex(vertices, sign, yMin, yMax, depthCenter, depthSize) {
  let best = null;
  let bestScore = -Infinity;
  vertices.forEach((v) => {
    if (v[1] < yMin || v[1] > yMax) return;
    if (sign * v[0] <= 0) return;
    // Prefer the side-most points that stay near mid-depth (where ears live),
    // penalizing skull-back candidates.
    const score = Math.abs(v[0]) - Math.abs(v[2] - depthCenter) / Math.max(depthSize, 0.0001) * 0.35;
    if (score > bestScore) {
      bestScore = score;
      best = v;
    }
  });
  return best ? [...best] : null;
}

function deriveLandmarks(vertices, faces) {
  const bounds = computeBounds(vertices);
  const [minX, minY] = [bounds.min[0], bounds.min[1]];
  const [W, H] = [bounds.size[0], bounds.size[1]];
  const cx = (bounds.min[0] + bounds.max[0]) / 2;

  const eyeY = minY + H * 0.55;
  const eyeDX = W * 0.18;
  const eyeL = frontSurfacePoint(vertices, faces, bounds, cx - eyeDX, eyeY);
  const eyeR = frontSurfacePoint(vertices, faces, bounds, cx + eyeDX, eyeY);

  // Nose tip: most protruding front point in the central column, strictly
  // below the eye line so brow geometry can never win.
  let noseTip = null;
  vertices.forEach((v) => {
    if (Math.abs(v[0] - cx) > W * 0.14) return;
    if (v[1] > eyeY - H * 0.02 || v[1] < eyeY - H * 0.25) return;
    if (noseTip === null || v[2] > noseTip[2]) noseTip = v;
  });
  noseTip = noseTip ? [...noseTip] : frontSurfacePoint(vertices, faces, bounds, cx, eyeY - H * 0.1);

  const mouth = frontSurfacePoint(vertices, faces, bounds, cx, minY + H * 0.3);
  const hairline = frontSurfacePoint(vertices, faces, bounds, cx, minY + H * 0.8);

  // Chin: lowest central vertex that still sits on the face front (these
  // meshes include a neck/shoulder base whose lowest points must not win).
  let chin = null;
  const chinZFloor = mouth[2] - bounds.size[2] * 0.22;
  vertices.forEach((v) => {
    if (Math.abs(v[0] - cx) > W * 0.18) return;
    if (v[2] < chinZFloor) return;
    if (v[1] > mouth[1] || v[1] < mouth[1] - H * 0.22) return;
    if (chin === null || v[1] < chin[1]) chin = v;
  });
  chin = chin ? [...chin] : frontSurfacePoint(vertices, faces, bounds, cx, minY + H * 0.06, 0.6);

  const depthCenter = (bounds.min[2] + bounds.max[2]) / 2;
  const earBandMin = eyeY - H * 0.08;
  const earBandMax = eyeY + H * 0.14;
  const earL = pickEarVertex(vertices, -1, earBandMin, earBandMax, depthCenter, bounds.size[2])
    || [bounds.min[0], eyeY, depthCenter];
  const earR = pickEarVertex(vertices, +1, earBandMin, earBandMax, depthCenter, bounds.size[2])
    || [bounds.max[0], eyeY, depthCenter];

  let crown = null;
  vertices.forEach((v) => {
    if (crown === null || v[1] > crown[1]) crown = v;
  });
  crown = crown ? [cx, crown[1], crown[2]] : [cx, bounds.max[1], (bounds.min[2] + bounds.max[2]) / 2];

  return { eyeL, eyeR, noseTip, mouth, earL, earR, hairline, crown, chin };
}

const LANDMARK_COLORS = {
  eyeL: '#e6194b', eyeR: '#e6194b', noseTip: '#3cb44b', mouth: '#4363d8',
  earL: '#f58231', earR: '#f58231', hairline: '#911eb4', crown: '#46f0f0', chin: '#808000',
};

function renderView(vertices, faces, landmarks, view, title) {
  // view: 'front' (screen x = world x, viewer at +z) | 'profile' (screen x = world z, looking from +x)
  const px = (v) => (view === 'front' ? v[0] : v[2]);
  const py = (v) => v[1];
  const pdepth = (v) => (view === 'front' ? v[2] : v[0]);

  const bounds = computeBounds(vertices);
  const all = vertices.map((v) => [px(v), py(v)]);
  let minX = Infinity; let maxX = -Infinity; let minY = Infinity; let maxY = -Infinity;
  all.forEach(([x, y]) => {
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  });
  const pad = Math.max(maxX - minX, maxY - minY) * 0.15;
  minX -= pad; maxX += pad; minY -= pad; maxY += pad;
  const size = 460;
  const scale = size / Math.max(maxX - minX, maxY - minY);
  const sx = (x) => (x - minX) * scale + 20;
  const sy = (y) => size - (y - minY) * scale + 40;

  const sortedFaces = [...faces].sort((a, b) => {
    const da = (pdepth(vertices[a[0]]) + pdepth(vertices[a[1]]) + pdepth(vertices[a[2]])) / 3;
    const db = (pdepth(vertices[b[0]]) + pdepth(vertices[b[1]]) + pdepth(vertices[b[2]])) / 3;
    return da - db;
  });

  const polys = sortedFaces.map((face) => {
    const pts = face.map((i) => `${sx(px(vertices[i])).toFixed(1)},${sy(py(vertices[i])).toFixed(1)}`).join(' ');
    return `<polygon points="${pts}" fill="#d8d2c4" fill-opacity="0.55" stroke="#7a7468" stroke-width="0.6"/>`;
  }).join('\n');

  // grid every 0.25 world units with labels
  const gridLines = [];
  const step = 0.25;
  for (let gx = Math.ceil(minX / step) * step; gx <= maxX; gx += step) {
    gridLines.push(`<line x1="${sx(gx)}" y1="${sy(minY)}" x2="${sx(gx)}" y2="${sy(maxY)}" stroke="#bbb" stroke-width="0.4"/>`);
    gridLines.push(`<text x="${sx(gx)}" y="${sy(minY) + 14}" font-size="9" fill="#666" text-anchor="middle">${gx.toFixed(2)}</text>`);
  }
  for (let gy = Math.ceil(minY / step) * step; gy <= maxY; gy += step) {
    gridLines.push(`<line x1="${sx(minX)}" y1="${sy(gy)}" x2="${sx(maxX)}" y2="${sy(gy)}" stroke="#bbb" stroke-width="0.4"/>`);
    gridLines.push(`<text x="${sx(minX) - 4}" y="${sy(gy) + 3}" font-size="9" fill="#666" text-anchor="end">${gy.toFixed(2)}</text>`);
  }

  const dots = Object.entries(landmarks).map(([name, v]) => {
    const color = LANDMARK_COLORS[name] || '#000';
    return `<circle cx="${sx(px(v)).toFixed(1)}" cy="${sy(py(v)).toFixed(1)}" r="4.5" fill="${color}" stroke="#000" stroke-width="0.8"/>`
      + `<text x="${sx(px(v)) + 6}" y="${sy(py(v)) - 4}" font-size="10" fill="${color}" font-weight="bold">${name}</text>`;
  }).join('\n');

  const axisLabel = view === 'front' ? 'screen-x = world X (front view, +Z toward viewer)' : 'screen-x = world Z (profile, face points right)';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size + 60}" height="${size + 80}" style="background:#fff">
<text x="20" y="18" font-size="13" font-weight="bold">${title} — ${view}</text>
<text x="20" y="32" font-size="10" fill="#555">${axisLabel} | bounds y:[${bounds.min[1].toFixed(2)}, ${bounds.max[1].toFixed(2)}]</text>
${gridLines.join('\n')}
${polys}
${dots}
</svg>`;
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  for (const { file, axes } of HEAD_FILES) {
    const filePath = path.join(HEADS_DIR, file);
    const json = JSON.parse(await fs.readFile(filePath, 'utf8'));
    const piece = json.pieces.find((p) => p.name === 'HEAD_BASE') || json.pieces[0];
    const geometry = piece.geometry.params || piece.geometry;
    const canonical = geometry.vertices.map((v) => toCanonical(v, axes));
    const faces = geometry.faces;

    const existing = json.landmarks
      ? Object.fromEntries(Object.entries(json.landmarks).map(([k, v]) => [k, toCanonical(v, axes)]))
      : null;
    const landmarks = existing || deriveLandmarks(canonical, faces);

    const base = file.replace(/\.json$/, '');
    await fs.writeFile(path.join(OUT_DIR, `${base}_front.svg`), renderView(canonical, faces, landmarks, 'front', base));
    await fs.writeFile(path.join(OUT_DIR, `${base}_profile.svg`), renderView(canonical, faces, landmarks, 'profile', base));
    console.log(`${base}: ${existing ? 'using stored landmarks' : 'derived landmarks'}`);
    Object.entries(landmarks).forEach(([k, v]) => {
      console.log(`  ${k.padEnd(9)} ${v.map((n) => n.toFixed(3)).join(', ')}`);
    });

    if (WRITE) {
      json.axes = axes;
      json.landmarks = Object.fromEntries(
        Object.entries(landmarks).map(([k, v]) => [k, fromCanonical(v, axes).map((n) => Math.round(n * 1e4) / 1e4)])
      );
      await fs.writeFile(filePath, `${JSON.stringify(json, null, 2)}\n`);
      console.log(`  -> wrote axes + landmarks into ${file}`);
    }
  }
  console.log(`\nPreviews in ${OUT_DIR}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
