// Procedural N64-style hair: instead of extruding flat SVG plaques, carve the
// scalp region out of the real head mesh and inflate it into a low-poly shell
// ("helmet") that follows the skull by construction. Works in the canonical
// head space produced by head-meshes.js (+Y up, +Z toward the face, height
// 1.2, bottom on y=0) and relies on the per-head landmarks.

const HAIR_HELMET_STYLES = Object.freeze({
  // backDrop 'jaw' lets the shell fall to chin level (bob/curtain cuts);
  // 'nape' stops just under the ears (short cuts).
  bowl: Object.freeze({ frontLift: -0.02, backDrop: 'jaw', shell: 0.05 }),
  cap: Object.freeze({ frontLift: 0, backDrop: 'nape', shell: 0.04 }),
  buzz: Object.freeze({ frontLift: 0.02, backDrop: 'nape', shell: 0.025 }),
  spikes: Object.freeze({ frontLift: 0, backDrop: 'nape', shell: 0.04, spikes: true }),
  ponytail: Object.freeze({ frontLift: 0, backDrop: 'nape', shell: 0.04, ponytail: true }),
});

const HAIR_PRESET_STYLE_MAP = Object.freeze({
  bob_01: 'bowl',
  n64_flip_bob_01: 'bowl',
  n64_round_bangs_01: 'bowl',
  n64_wavy_mid_01: 'bowl',
  bridge_curtain_long_01: 'bowl',
  bridge_bowl_01: 'bowl',
  side_part_01: 'cap',
  psx_layered_hero_01: 'cap',
  psx_slick_back_01: 'cap',
  psx_buzz_cut_01: 'buzz',
  short_spikes_01: 'spikes',
  n64_puff_spikes_01: 'spikes',
  ponytail_01: 'ponytail',
  n64_chunky_pony_01: 'ponytail',
  bridge_low_pony_01: 'ponytail',
});

const HAIR_PRESET_STYLE_OVERRIDES = Object.freeze({
  bob_01: Object.freeze({ shellScale: 1, frontLift: -0.01 }),
  side_part_01: Object.freeze({ sideBias: 0.08 }),
  short_spikes_01: Object.freeze({ spikeCount: 4, spikeLength: 0.13, spikeWidth: 0.045 }),
  ponytail_01: Object.freeze({ ponytailOffsetX: 0.16, ponytailLength: 0.34 }),
  psx_layered_hero_01: Object.freeze({ shellScale: 1.25, frontLift: -0.035, sideBias: -0.035 }),
  psx_slick_back_01: Object.freeze({ shellScale: 0.85, frontLift: 0.07 }),
  psx_buzz_cut_01: Object.freeze({ shellScale: 0.72, frontLift: 0.035 }),
  n64_flip_bob_01: Object.freeze({ shellScale: 1.25, frontLift: -0.025 }),
  n64_round_bangs_01: Object.freeze({ shellScale: 1.12, frontLift: -0.065 }),
  n64_puff_spikes_01: Object.freeze({ shellScale: 1.25, spikeCount: 6, spikeLength: 0.22, spikeWidth: 0.07 }),
  n64_wavy_mid_01: Object.freeze({ shellScale: 1.3, frontLift: -0.04 }),
  n64_chunky_pony_01: Object.freeze({ shellScale: 1.15, ponytailOffsetX: 0.2, ponytailLength: 0.38, ponytailWidth: 1.35 }),
  bridge_curtain_long_01: Object.freeze({ centerPart: 0.12, frontLift: -0.035 }),
  bridge_bowl_01: Object.freeze({ shellScale: 0.92, frontLift: -0.055 }),
  bridge_low_pony_01: Object.freeze({ ponytailOffsetX: 0, ponytailLength: 0.46, ponytailRootDrop: 0.08 }),
});

function clamp(value, min, max, fallback = min) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(Math.max(numeric, min), max);
}

function sliderToUnit(value) {
  return clamp(value, -48, 48, 0) / 48;
}

export function resolveHairHelmetStyle(hairPresetId, placement = null) {
  const styleId = HAIR_PRESET_STYLE_MAP[String(hairPresetId || '').trim()] || null;
  if (!styleId) return null;

  const base = HAIR_HELMET_STYLES[styleId];
  const overrides = HAIR_PRESET_STYLE_OVERRIDES[hairPresetId] || {};
  const volume = clamp(placement?.size, 0.7, 1.35, 1);
  const hairline = -sliderToUnit(placement?.offsetY) * 0.1;
  const length = sliderToUnit(placement?.length);

  return {
    id: styleId,
    ...base,
    ...overrides,
    volume,
    hairline,
    length,
    shell: base.shell * (overrides.shellScale || 1) * volume,
    frontLift: base.frontLift + (overrides.frontLift || 0) + hairline,
  };
}

function computeBounds(vertices) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  vertices.forEach((vertex) => {
    for (let axis = 0; axis < 3; axis += 1) {
      min[axis] = Math.min(min[axis], vertex[axis]);
      max[axis] = Math.max(max[axis], vertex[axis]);
    }
  });
  return { min, max };
}

function radialDirection(vertex, center) {
  const dx = vertex[0] - center[0];
  const dy = vertex[1] - center[1];
  const dz = vertex[2] - center[2];
  const length = Math.sqrt((dx * dx) + (dy * dy) + (dz * dz)) || 1;
  return [dx / length, dy / length, dz / length];
}

function offsetVertex(vertex, direction, distance) {
  return [
    vertex[0] + (direction[0] * distance),
    vertex[1] + (direction[1] * distance),
    vertex[2] + (direction[2] * distance),
  ];
}

// Tapered rectangular prism used for the ponytail tail.
function appendTaperedPrism(vertices, faces, from, to, fromHalf, toHalf) {
  const base = vertices.length;
  [
    [from[0] - fromHalf[0], from[1], from[2] - fromHalf[1]],
    [from[0] + fromHalf[0], from[1], from[2] - fromHalf[1]],
    [from[0] + fromHalf[0], from[1], from[2] + fromHalf[1]],
    [from[0] - fromHalf[0], from[1], from[2] + fromHalf[1]],
    [to[0] - toHalf[0], to[1], to[2] - toHalf[1]],
    [to[0] + toHalf[0], to[1], to[2] - toHalf[1]],
    [to[0] + toHalf[0], to[1], to[2] + toHalf[1]],
    [to[0] - toHalf[0], to[1], to[2] + toHalf[1]],
  ].forEach((vertex) => vertices.push(vertex));

  const quads = [
    [0, 1, 5, 4],
    [1, 2, 6, 5],
    [2, 3, 7, 6],
    [3, 0, 4, 7],
    [4, 5, 6, 7],
    [3, 2, 1, 0],
  ];
  quads.forEach(([a, b, c, d]) => {
    faces.push([base + a, base + b, base + c]);
    faces.push([base + a, base + c, base + d]);
  });
}

function appendSpike(vertices, faces, origin, direction, length, halfWidth) {
  // Build two vectors perpendicular to the spike direction for the base quad.
  const reference = Math.abs(direction[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
  const u = [
    (direction[1] * reference[2]) - (direction[2] * reference[1]),
    (direction[2] * reference[0]) - (direction[0] * reference[2]),
    (direction[0] * reference[1]) - (direction[1] * reference[0]),
  ];
  const uLength = Math.sqrt((u[0] * u[0]) + (u[1] * u[1]) + (u[2] * u[2])) || 1;
  u[0] /= uLength; u[1] /= uLength; u[2] /= uLength;
  const w = [
    (direction[1] * u[2]) - (direction[2] * u[1]),
    (direction[2] * u[0]) - (direction[0] * u[2]),
    (direction[0] * u[1]) - (direction[1] * u[0]),
  ];

  const base = vertices.length;
  const corners = [
    [1, 1], [-1, 1], [-1, -1], [1, -1],
  ];
  corners.forEach(([su, sw]) => {
    vertices.push([
      origin[0] + (u[0] * halfWidth * su) + (w[0] * halfWidth * sw),
      origin[1] + (u[1] * halfWidth * su) + (w[1] * halfWidth * sw),
      origin[2] + (u[2] * halfWidth * su) + (w[2] * halfWidth * sw),
    ]);
  });
  vertices.push(offsetVertex(origin, direction, length));

  const apex = base + 4;
  faces.push([base, base + 1, apex]);
  faces.push([base + 1, base + 2, apex]);
  faces.push([base + 2, base + 3, apex]);
  faces.push([base + 3, base, apex]);
  faces.push([base + 2, base + 1, base]);
  faces.push([base, base + 3, base + 2]);
}

function pickSpreadPoints(candidates, maxCount, minDistance) {
  const picked = [];
  const sorted = [...candidates].sort((a, b) => b.vertex[1] - a.vertex[1]);
  sorted.forEach((candidate) => {
    if (picked.length >= maxCount) return;
    const farEnough = picked.every((other) => {
      const dx = candidate.vertex[0] - other.vertex[0];
      const dz = candidate.vertex[2] - other.vertex[2];
      return Math.sqrt((dx * dx) + (dz * dz)) >= minDistance;
    });
    if (farEnough) picked.push(candidate);
  });
  return picked;
}

// Builds the helmet in canonical head space. Returns { vertices, faces } or
// null when the head/landmarks cannot support it.
export function buildHairHelmetGeometry(headGeometry, landmarks, style) {
  const sourceVertices = headGeometry?.vertices;
  const sourceFaces = headGeometry?.faces;
  if (!Array.isArray(sourceVertices) || sourceVertices.length === 0) return null;
  if (!Array.isArray(sourceFaces) || sourceFaces.length === 0) return null;
  if (!style || !landmarks?.hairline || !landmarks?.crown) return null;
  if (!landmarks.eyeL || !landmarks.eyeR) return null;

  const bounds = computeBounds(sourceVertices);
  const headHeight = Math.max(bounds.max[1] - bounds.min[1], 0.0001);
  const eyeMidY = (landmarks.eyeL[1] + landmarks.eyeR[1]) * 0.5;
  const earMidY = landmarks.earL && landmarks.earR
    ? (landmarks.earL[1] + landmarks.earR[1]) * 0.5
    : eyeMidY;
  const chinY = landmarks.chin ? landmarks.chin[1] : bounds.min[1] + (headHeight * 0.15);

  const frontCutoff = landmarks.hairline[1] + (style.frontLift * headHeight);
  const lengthControl = clamp(style.length, -1, 1, 0);
  const baseBackCutoff = style.backDrop === 'jaw'
    ? chinY + (headHeight * 0.05)
    : earMidY - (headHeight * 0.02);
  const backCutoff = baseBackCutoff - (lengthControl * headHeight * (style.backDrop === 'jaw' ? 0.08 : 0.14));
  const zFront = landmarks.hairline[2];
  const zBack = bounds.min[2];
  const zSpan = Math.max(zFront - zBack, 0.0001);

  const headWidth = Math.max(bounds.max[0] - bounds.min[0], 0.0001);
  const cutoffAt = (vertex) => {
    const [x, , z] = vertex;
    const t = Math.min(Math.max((z - zBack) / zSpan, 0), 1);
    const xNormalized = Math.min(Math.max(x / (headWidth * 0.5), -1), 1);
    const sideShift = (style.sideBias || 0) * xNormalized * headHeight * t;
    const centerPartLift = (style.centerPart || 0) * (1 - Math.abs(xNormalized)) * headHeight * t;
    return backCutoff + (t * (frontCutoff - backCutoff)) + sideShift + centerPartLift;
  };

  const inScalp = sourceVertices.map((vertex) => vertex[1] >= cutoffAt(vertex));
  const scalpFaces = sourceFaces.filter((face) => (
    Array.isArray(face) && face.length === 3 && face.every((index) => inScalp[index])
  ));
  if (scalpFaces.length === 0) return null;

  const center = [0, eyeMidY, 0];
  const shell = style.shell * (headHeight / 1.2);
  const innerGap = 0.01 * (headHeight / 1.2);

  // Remap the scalp subset into a compact vertex list: outer shell first,
  // then a slightly inflated copy of the scalp itself as the inner skin.
  const indexMap = new Map();
  const vertices = [];
  const faces = [];
  scalpFaces.forEach((face) => {
    face.forEach((index) => {
      if (indexMap.has(index)) return;
      indexMap.set(index, indexMap.size);
      const direction = radialDirection(sourceVertices[index], center);
      vertices.push(offsetVertex(sourceVertices[index], direction, shell));
    });
  });
  const innerOffset = indexMap.size;
  indexMap.forEach((compact, sourceIndex) => {
    const direction = radialDirection(sourceVertices[sourceIndex], center);
    vertices[innerOffset + compact] = offsetVertex(sourceVertices[sourceIndex], direction, innerGap);
  });
  vertices.length = innerOffset * 2;

  const edgeUse = new Map();
  scalpFaces.forEach((face) => {
    const outer = face.map((index) => indexMap.get(index));
    faces.push(outer);
    faces.push([innerOffset + outer[2], innerOffset + outer[1], innerOffset + outer[0]]);
    for (let i = 0; i < 3; i += 1) {
      const a = outer[i];
      const b = outer[(i + 1) % 3];
      const key = a < b ? `${a}_${b}` : `${b}_${a}`;
      const entry = edgeUse.get(key);
      if (entry) {
        entry.count += 1;
      } else {
        edgeUse.set(key, { a, b, count: 1 });
      }
    }
  });

  // Close the rim so the shell reads as a solid wedge of hair.
  edgeUse.forEach(({ a, b, count }) => {
    if (count !== 1) return;
    faces.push([a, b, innerOffset + b]);
    faces.push([a, innerOffset + b, innerOffset + a]);
  });

  if (style.spikes) {
    const crownFloor = landmarks.crown[1] - (headHeight * 0.22);
    const candidates = [];
    for (let i = 0; i < innerOffset; i += 1) {
      if (vertices[i][1] >= crownFloor) {
        candidates.push({ vertex: vertices[i] });
      }
    }
    const spikeCount = Math.round(clamp(style.spikeCount, 3, 8, 6));
    const spikeLength = clamp(style.spikeLength, 0.1, 0.28, 0.18);
    const spikeWidth = clamp(style.spikeWidth, 0.035, 0.09, 0.055);
    pickSpreadPoints(candidates, spikeCount, headHeight * 0.16).forEach(({ vertex }) => {
      const direction = radialDirection(vertex, center);
      appendSpike(vertices, faces, vertex, direction, headHeight * spikeLength, headHeight * spikeWidth);
    });
  }

  if (style.ponytail) {
    const ponyVolume = clamp(style.volume, 0.7, 1.35, 1);
    const ponyLength = Math.max(0.16, (style.ponytailLength || 0.3) + (lengthControl * 0.14));
    const ponyOffsetX = (style.ponytailOffsetX || 0) * headHeight;
    const ponyRootDrop = (style.ponytailRootDrop || 0) * headHeight;
    const ponyWidth = style.ponytailWidth || 1;
    const tailTop = [ponyOffsetX, earMidY + (headHeight * 0.12) - ponyRootDrop, zBack + (headHeight * 0.02)];
    const tailMid = [
      ponyOffsetX,
      earMidY - (headHeight * ponyLength * 0.42) - ponyRootDrop,
      zBack - (headHeight * (0.16 + (lengthControl * 0.03))),
    ];
    const tailEnd = [
      ponyOffsetX,
      earMidY - (headHeight * ponyLength) - ponyRootDrop,
      zBack - (headHeight * (0.1 + (lengthControl * 0.04))),
    ];
    appendTaperedPrism(
      vertices,
      faces,
      tailTop,
      tailMid,
      [headHeight * 0.085 * ponyVolume * ponyWidth, headHeight * 0.085 * ponyVolume * ponyWidth],
      [headHeight * 0.065 * ponyVolume * ponyWidth, headHeight * 0.075 * ponyVolume * ponyWidth],
    );
    appendTaperedPrism(
      vertices,
      faces,
      tailMid,
      tailEnd,
      [headHeight * 0.065 * ponyVolume * ponyWidth, headHeight * 0.075 * ponyVolume * ponyWidth],
      [headHeight * 0.035 * ponyVolume * ponyWidth, headHeight * 0.04 * ponyVolume * ponyWidth],
    );
  }

  return { vertices, faces };
}
