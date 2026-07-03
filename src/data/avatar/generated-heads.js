// Parametric skull generator (tasks.md H1.1).
//
// Produces clean low-poly craniums with NO sculpted facial features: eyes,
// mouth and brows arrive later as sprite decals, nose/ears/hair as mounted
// 3D pieces. Every head is emitted directly in the canonical head space used
// by the avatar pipeline (+Y up, +Z toward the face, height 1.2, bottom at
// y = 0, centered on x/z) and carries landmarks derived from the same
// formulas that build the mesh, so features mount exactly by construction.
//
// The shape is a stack of 8-sided elliptical rings (chin, jaw, mouth, eye
// line, brow, two dome rings) closed by a crown apex and a base fan. Rings
// use separate front/back half-depths so the skull can recede at the back
// while the face stays forward, and the two front-diagonal vertices of the
// facial rings are pulled toward the front plane (`faceFlatness`) to create
// the flat face plate the decal sits on.

const HEAD_CANONICAL_HEIGHT = 1.2;
const SIDES = 8;

export const DEFAULT_HEAD_SPEC = Object.freeze({
  skullWidth: 0.8, // full width in canonical units (height is fixed at 1.2)
  skullDepth: 0.86, // full front-to-back depth in canonical units
  jawWidth: 0.6, // jaw width as a fraction of skullWidth
  jawDrop: 0.5, // 0 = short round face, 1 = long face
  chinShape: 0.35, // 0 = round chin, 1 = pointy chin
  cheekFullness: 0.35, // 0 = flat cheeks, 1 = puffy cheeks
  faceFlatness: 0.6, // how strongly the face plate is flattened
  crownRoundness: 0.6, // 0 = flat top, 1 = full dome
  eyeLineHeight: 0.5, // eye line as a fraction of total height
});

function clamp(value, min, max) {
  return Math.min(Math.max(Number.isFinite(value) ? value : min, min), max);
}

function resolveSpec(spec = {}) {
  const merged = { ...DEFAULT_HEAD_SPEC, ...spec };
  return {
    skullWidth: clamp(merged.skullWidth, 0.5, 1.1),
    skullDepth: clamp(merged.skullDepth, 0.5, 1.05),
    jawWidth: clamp(merged.jawWidth, 0.35, 0.95),
    jawDrop: clamp(merged.jawDrop, 0, 1),
    chinShape: clamp(merged.chinShape, 0, 1),
    cheekFullness: clamp(merged.cheekFullness, 0, 1),
    faceFlatness: clamp(merged.faceFlatness, 0, 1),
    crownRoundness: clamp(merged.crownRoundness, 0, 1),
    eyeLineHeight: clamp(merged.eyeLineHeight, 0.42, 0.6),
  };
}

// One horizontal ring: 8 vertices, index 0 at the exact front (+z), going
// toward the character's right (negative x) first so vertex order is
// counter-clockwise when seen from above. Elliptical with separate front and
// back half-depths; the two front diagonals can be flattened toward the
// front plane to build the face plate.
function ringVertices(ring) {
  const vertices = [];
  for (let i = 0; i < SIDES; i += 1) {
    const theta = (i / SIDES) * Math.PI * 2;
    const sin = Math.sin(theta);
    const cos = Math.cos(theta);
    let x = -ring.w * sin;
    let z = cos >= 0 ? cos * ring.f : cos * ring.b;
    if (cos > 0.5 && cos < 1 && ring.flatten > 0) {
      // Pull the front diagonals toward the front plane (z = f).
      z += (ring.f - z) * ring.flatten;
    }
    if (Math.abs(x) < 1e-9) x = 0;
    if (Math.abs(z) < 1e-9) z = 0;
    vertices.push([x, ring.y, z]);
  }
  return vertices;
}

// Linear interpolation of the front-plane depth at a given height, walking
// the ring stack. Used to place landmarks exactly on the surface.
function frontDepthAt(rings, y) {
  if (y <= rings[0].y) return rings[0].f;
  for (let i = 0; i < rings.length - 1; i += 1) {
    const a = rings[i];
    const b = rings[i + 1];
    if (y >= a.y && y <= b.y) {
      const t = (y - a.y) / Math.max(b.y - a.y, 1e-6);
      return a.f + (b.f - a.f) * t;
    }
  }
  return rings[rings.length - 1].f;
}

function widthAt(rings, y) {
  if (y <= rings[0].y) return rings[0].w;
  for (let i = 0; i < rings.length - 1; i += 1) {
    const a = rings[i];
    const b = rings[i + 1];
    if (y >= a.y && y <= b.y) {
      const t = (y - a.y) / Math.max(b.y - a.y, 1e-6);
      return a.w + (b.w - a.w) * t;
    }
  }
  return rings[rings.length - 1].w;
}

function buildRings(s) {
  const H = HEAD_CANONICAL_HEIGHT;
  const D = s.skullDepth; // f/b below are signed fractions of the full depth
  const SW = s.skullWidth; // half-widths below are fractions of the full width

  const eyeY = s.eyeLineHeight * H;
  const mouthRingY = eyeY * (0.44 + 0.12 * s.jawDrop);
  const jawY = mouthRingY * 0.57;
  const chinY = 0.05 * H;
  const browY = Math.min(eyeY + 0.2 * H, 0.92 * H);
  const dome1Y = Math.min(browY + 0.17 * H, 1.02 * H);
  const dome2Y = dome1Y + (H - dome1Y) * 0.62;

  const flat = s.faceFlatness;
  const cheek = s.cheekFullness;
  const crown = s.crownRoundness;
  const jf = Math.min(s.jawWidth / 0.6, 1.15);

  // Proportions anchored on measured slices of the best hand-made head
  // heroic baseline: vertical face plate from mouth to eyes (front ~0.49 D),
  // receding forehead (~0.40 D), strong occipital mass behind and above the
  // ears (back grows from 0.31 D at the mouth to 0.52 D at the upper skull).
  return {
    eyeY,
    mouthRingY,
    browY,
    rings: [
      { y: chinY, w: SW * 0.25 * jf * (1 - 0.28 * s.chinShape), f: D * (0.34 - 0.08 * s.chinShape), b: D * 0.26, flatten: flat * 0.6 },
      { y: jawY, w: SW * 0.44 * jf * (1 + 0.06 * cheek), f: D * (0.41 + 0.02 * cheek), b: D * 0.33, flatten: flat * 0.9 },
      { y: mouthRingY, w: SW * (0.43 + 0.04 * cheek), f: D * (0.47 + 0.03 * cheek), b: D * 0.37, flatten: flat },
      { y: eyeY, w: SW * 0.465, f: D * 0.49, b: D * 0.41, flatten: flat },
      { y: browY, w: SW * 0.5, f: D * 0.42, b: D * 0.5, flatten: flat * 0.85 },
      { y: dome1Y, w: SW * (0.45 + 0.03 * crown), f: D * 0.34, b: D * (0.51 + 0.02 * crown), flatten: flat * 0.3 },
      { y: dome2Y, w: SW * (0.3 + 0.08 * crown), f: D * 0.23, b: D * (0.4 + 0.05 * crown), flatten: 0 },
    ],
  };
}

function buildGeometry(s) {
  const layout = buildRings(s);
  const { rings } = layout;
  const vertices = [];
  const faces = [];

  rings.forEach((ring) => {
    vertices.push(...ringVertices(ring));
  });

  // Side wall quads between consecutive rings. Ring vertices run clockwise
  // when viewed from outside the front, so (lower j, lower j+1, upper j+1)
  // winds counter-clockwise seen from outside.
  for (let r = 0; r < rings.length - 1; r += 1) {
    const a = r * SIDES;
    const b = (r + 1) * SIDES;
    for (let j = 0; j < SIDES; j += 1) {
      const k = (j + 1) % SIDES;
      faces.push([a + k, a + j, b + k]);
      faces.push([b + k, a + j, b + j]);
    }
  }

  // Crown apex.
  const apexIndex = vertices.length;
  const apexBack = -0.1 * s.skullDepth;
  vertices.push([0, HEAD_CANONICAL_HEIGHT, apexBack]);
  const top = (rings.length - 1) * SIDES;
  for (let j = 0; j < SIDES; j += 1) {
    const k = (j + 1) % SIDES;
    faces.push([top + k, top + j, apexIndex]);
  }

  // Base fan under the chin ring (closes the mesh toward the neck).
  const baseIndex = vertices.length;
  vertices.push([0, 0, rings[0].f * 0.35]);
  for (let j = 0; j < SIDES; j += 1) {
    const k = (j + 1) % SIDES;
    faces.push([j, k, baseIndex]);
  }

  return { vertices, faces, layout };
}

function buildLandmarks(s, layout, surface) {
  const { rings, eyeY, mouthRingY, browY } = layout;
  const interocular = 0.42 * s.skullWidth;
  const eyeX = interocular * 0.5;

  // Surface z at the eye position: interpolate between the front vertex and
  // the flattened front diagonal of the eye-line ring.
  const eyeRing = rings[3];
  const diagX = eyeRing.w * Math.SQRT1_2;
  const diagZRaw = eyeRing.f * Math.SQRT1_2;
  const diagZ = diagZRaw + (eyeRing.f - diagZRaw) * eyeRing.flatten;
  const tEye = Math.min(eyeX / Math.max(diagX, 1e-6), 1);
  const eyeZ = eyeRing.f + (diagZ - eyeRing.f) * tEye;

  const mouthY = mouthRingY - 0.055 * HEAD_CANONICAL_HEIGHT;
  const noseY = (eyeY + mouthY) * 0.5 + 0.025;
  const hairlineY = Math.min(browY + 0.09 * HEAD_CANONICAL_HEIGHT, 0.94 * HEAD_CANONICAL_HEIGHT);

  return {
    eyeL: [-eyeX, eyeY, eyeZ],
    eyeR: [eyeX, eyeY, eyeZ],
    noseTip: [0, noseY, frontDepthAt(rings, noseY)],
    mouth: [0, mouthY, frontDepthAt(rings, mouthY)],
    earL: [-widthAt(rings, eyeY - 0.01), eyeY - 0.01, 0],
    earR: [widthAt(rings, eyeY - 0.01), eyeY - 0.01, 0],
    hairline: [0, hairlineY, frontDepthAt(rings, hairlineY)],
    crown: surface.crown,
    chin: [0, rings[0].y + 0.02, rings[0].f * 0.92],
  };
}

// Recentre/rescale into the exact canonical box (same contract that
// head-meshes.js enforces on imported heads): height 1.2, min y = 0,
// centered bounds on x and z. Landmarks ride the same transform.
function normalizeToCanonical(vertices, landmarks) {
  let minX = Infinity; let maxX = -Infinity;
  let minY = Infinity; let maxY = -Infinity;
  let minZ = Infinity; let maxZ = -Infinity;
  vertices.forEach(([x, y, z]) => {
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
  });
  const scale = HEAD_CANONICAL_HEIGHT / Math.max(maxY - minY, 1e-4);
  const cx = (minX + maxX) * 0.5;
  const cz = (minZ + maxZ) * 0.5;
  const map = ([x, y, z]) => [
    (x - cx) * scale,
    (y - minY) * scale,
    (z - cz) * scale,
  ];
  return {
    vertices: vertices.map(map),
    landmarks: Object.fromEntries(
      Object.entries(landmarks).map(([key, vertex]) => [key, map(vertex)])
    ),
  };
}

export function buildGeneratedHead(spec = {}) {
  const s = resolveSpec(spec);
  const { vertices, faces, layout } = buildGeometry(s);
  const apex = vertices[vertices.length - 2];
  const rawLandmarks = buildLandmarks(s, layout, { crown: [...apex] });
  const normalized = normalizeToCanonical(vertices, rawLandmarks);

  return {
    spec: s,
    customGeometry: {
      vertices: normalized.vertices,
      faces: faces.map((face) => [...face]),
    },
    landmarks: normalized.landmarks,
    axes: { up: '+y', front: '+z' },
  };
}

// Curated skull presets (tasks.md H1.2). These are intentionally just data:
// the FABLE pass that follows can tune the numbers from capture sweeps without
// changing the generator contract or catalog registration.
export const GENERATED_HEAD_PRESETS = Object.freeze([
  Object.freeze({
    id: 'gen_head_round',
    name: 'Round',
    spec: Object.freeze({
      skullWidth: 0.82,
      skullDepth: 0.74,
      jawWidth: 0.58,
      jawDrop: 0.28,
      chinShape: 0.02,
      cheekFullness: 0.9,
      faceFlatness: 0.68,
      crownRoundness: 0.95,
      eyeLineHeight: 0.48,
    }),
  }),
  Object.freeze({
    id: 'gen_head_square',
    name: 'Square',
    spec: Object.freeze({
      skullWidth: 0.9,
      skullDepth: 0.82,
      jawWidth: 0.95,
      jawDrop: 0.62,
      chinShape: 0.92,
      cheekFullness: 0.18,
      faceFlatness: 0.66,
      crownRoundness: 0.08,
      eyeLineHeight: 0.52,
    }),
  }),
  Object.freeze({
    id: 'gen_head_long',
    name: 'Long',
    spec: Object.freeze({
      skullWidth: 0.72,
      skullDepth: 0.86,
      jawWidth: 0.56,
      jawDrop: 0.9,
      chinShape: 0.45,
      cheekFullness: 0.22,
      faceFlatness: 0.58,
      crownRoundness: 0.55,
      eyeLineHeight: 0.55,
    }),
  }),
  Object.freeze({
    id: 'gen_head_chibi',
    name: 'Chibi',
    spec: Object.freeze({
      skullWidth: 1.06,
      skullDepth: 0.96,
      jawWidth: 0.38,
      jawDrop: 0.3,
      chinShape: 0.04,
      cheekFullness: 0.82,
      faceFlatness: 0.72,
      crownRoundness: 1,
      eyeLineHeight: 0.52,
    }),
  }),
  Object.freeze({
    id: 'gen_head_slim',
    name: 'Slim',
    spec: Object.freeze({
      skullWidth: 0.7,
      skullDepth: 0.8,
      jawWidth: 0.42,
      jawDrop: 0.56,
      chinShape: 0.42,
      cheekFullness: 0.04,
      faceFlatness: 0.62,
      crownRoundness: 0.62,
      eyeLineHeight: 0.52,
    }),
  }),
  Object.freeze({
    id: 'gen_head_broad',
    name: 'Broad',
    spec: Object.freeze({
      skullWidth: 1.08,
      skullDepth: 0.98,
      jawWidth: 0.76,
      jawDrop: 0.5,
      chinShape: 0.24,
      cheekFullness: 0.95,
      faceFlatness: 0.54,
      crownRoundness: 0.78,
      eyeLineHeight: 0.49,
    }),
  }),
  Object.freeze({
    id: 'gen_head_heroic',
    name: 'Heroic',
    spec: Object.freeze({
      skullWidth: 0.78,
      skullDepth: 0.92,
      jawWidth: 0.64,
      jawDrop: 0.72,
      chinShape: 0.55,
      cheekFullness: 0.22,
      faceFlatness: 0.58,
      crownRoundness: 0.5,
      eyeLineHeight: 0.55,
    }),
  }),
  Object.freeze({
    id: 'gen_head_wide_jaw',
    name: 'Wide Jaw',
    spec: Object.freeze({
      skullWidth: 0.92,
      skullDepth: 0.84,
      jawWidth: 0.94,
      jawDrop: 0.6,
      chinShape: 0.82,
      cheekFullness: 0.58,
      faceFlatness: 0.55,
      crownRoundness: 0.22,
      eyeLineHeight: 0.5,
    }),
  }),
]);

export const DEFAULT_GENERATED_HEAD_ID = 'gen_head_heroic';

export const GENERATED_HEAD_PARAM_KEYS = Object.freeze([
  'skullWidth',
  'jawDrop',
  'crownRoundness',
  'cheekFullness',
]);

export function resolveGeneratedHeadPreset(id) {
  return GENERATED_HEAD_PRESETS.find((entry) => entry.id === id)
    || GENERATED_HEAD_PRESETS.find((entry) => entry.id === DEFAULT_GENERATED_HEAD_ID)
    || GENERATED_HEAD_PRESETS[0];
}

export function isGeneratedHeadId(id) {
  return GENERATED_HEAD_PRESETS.some((entry) => entry.id === id);
}

export function resolveGeneratedHeadSpecById(id, headParams = {}) {
  const preset = resolveGeneratedHeadPreset(id);
  const spec = { ...preset.spec };
  GENERATED_HEAD_PARAM_KEYS.forEach((key) => {
    const baseValue = Number.isFinite(spec[key]) ? spec[key] : DEFAULT_HEAD_SPEC[key];
    const delta = Number.isFinite(headParams?.[key]) ? headParams[key] : 0;
    spec[key] = baseValue + delta;
  });
  return spec;
}

export function buildGeneratedHeadById(id, headParams = {}) {
  const preset = resolveGeneratedHeadPreset(id);
  return { id: preset.id, ...buildGeneratedHead(resolveGeneratedHeadSpecById(preset.id, headParams)) };
}
