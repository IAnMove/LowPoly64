import {
  CHARACTER_MOLD_PROPORTIONS,
  GENERATED_CHARACTER_MOLDS,
} from '../src/data/templates/generated-character-molds.js';

const TOLERANCE = 0.1;
const REQUIRED_FIELDS = [
  'totalHeight',
  'headsHigh',
  'shoulderWidthInHeads',
  'armLengthFraction',
  'legLengthFraction',
  'handHeightInHeads',
  'footLengthInHeads',
];

function createBounds() {
  return {
    min: [Infinity, Infinity, Infinity],
    max: [-Infinity, -Infinity, -Infinity],
  };
}

function expandBounds(bounds, point) {
  for (let i = 0; i < 3; i += 1) {
    bounds.min[i] = Math.min(bounds.min[i], point[i]);
    bounds.max[i] = Math.max(bounds.max[i], point[i]);
  }
}

function unionBounds(target, source) {
  expandBounds(target, source.min);
  expandBounds(target, source.max);
  return target;
}

function boundsSize(bounds) {
  return [
    bounds.max[0] - bounds.min[0],
    bounds.max[1] - bounds.min[1],
    bounds.max[2] - bounds.min[2],
  ];
}

function localBoundsForPiece(piece) {
  const bounds = createBounds();
  const template = piece.template;
  const params = piece.params || {};
  const size = piece.size || [1, 1, 1];

  if (template === 'CUSTOM') {
    for (const vertex of params.vertices || []) expandBounds(bounds, vertex);
    return bounds;
  }

  if (template === 'CUBE') {
    const [width, height, depth] = size;
    expandBounds(bounds, [-width / 2, -height / 2, -depth / 2]);
    expandBounds(bounds, [width / 2, height / 2, depth / 2]);
    return bounds;
  }

  if (template === 'TAPERED_BOX') {
    const [widthBottom, height, depthBottom] = size;
    const widthTop = params.widthTop ?? widthBottom;
    const depthTop = params.depthTop ?? depthBottom;
    const offsetTopX = params.offsetTopX ?? 0;
    const offsetTopZ = params.offsetTopZ ?? 0;
    expandBounds(bounds, [-widthBottom / 2, -height / 2, -depthBottom / 2]);
    expandBounds(bounds, [widthBottom / 2, -height / 2, depthBottom / 2]);
    expandBounds(bounds, [offsetTopX - (widthTop / 2), height / 2, offsetTopZ - (depthTop / 2)]);
    expandBounds(bounds, [offsetTopX + (widthTop / 2), height / 2, offsetTopZ + (depthTop / 2)]);
    return bounds;
  }

  if (template === 'LIMB_LOFT') {
    for (const section of params.sections || []) {
      const radiusZ = section.radiusZ ?? section.radiusX ?? 0;
      expandBounds(bounds, [
        (section.offsetX ?? 0) - (section.radiusX ?? 0),
        section.y,
        (section.offsetZ ?? 0) - radiusZ,
      ]);
      expandBounds(bounds, [
        (section.offsetX ?? 0) + (section.radiusX ?? 0),
        section.y,
        (section.offsetZ ?? 0) + radiusZ,
      ]);
    }
    return bounds;
  }

  throw new Error(`Unsupported mold template ${template} on piece ${piece.name}`);
}

function worldBoundsForPiece(piece) {
  const bounds = localBoundsForPiece(piece);
  const offset = piece.offset || [0, 0, 0];
  return {
    min: bounds.min.map((value, index) => value + offset[index]),
    max: bounds.max.map((value, index) => value + offset[index]),
  };
}

function allPieces(mold) {
  return mold.slots.flatMap((slot) => slot.pieces);
}

function pieceByName(pieces, name) {
  const piece = pieces.find((entry) => entry.name === name);
  if (!piece) throw new Error(`Missing piece ${name}`);
  return piece;
}

function average(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function pieceUnionHeight(pieces, names) {
  const bounds = createBounds();
  for (const name of names) unionBounds(bounds, worldBoundsForPiece(pieceByName(pieces, name)));
  return boundsSize(bounds)[1];
}

function measureMold(mold) {
  const pieces = allPieces(mold);
  const bodyBounds = createBounds();
  for (const piece of pieces) unionBounds(bodyBounds, worldBoundsForPiece(piece));

  const headBounds = worldBoundsForPiece(pieceByName(pieces, 'HEAD'));
  const headSize = boundsSize(headBounds);
  const totalHeight = boundsSize(bodyBounds)[1];
  const torso = pieceByName(pieces, 'TORSO');
  const torsoShoulderWidth = torso.params?.widthTop ?? boundsSize(localBoundsForPiece(torso))[0];
  const armLength = average([
    pieceUnionHeight(pieces, ['ARM_L', 'ARM_L_FOREARM']),
    pieceUnionHeight(pieces, ['ARM_R', 'ARM_R_FOREARM']),
  ]);
  const legLength = average([
    pieceUnionHeight(pieces, ['LEG_L', 'LEG_L_SHIN']),
    pieceUnionHeight(pieces, ['LEG_R', 'LEG_R_SHIN']),
  ]);
  const handHeight = average([
    boundsSize(worldBoundsForPiece(pieceByName(pieces, 'HAND_L')))[1],
    boundsSize(worldBoundsForPiece(pieceByName(pieces, 'HAND_R')))[1],
  ]);
  const footLength = average([
    boundsSize(worldBoundsForPiece(pieceByName(pieces, 'FOOT_L')))[2],
    boundsSize(worldBoundsForPiece(pieceByName(pieces, 'FOOT_R')))[2],
  ]);

  return {
    totalHeight,
    headsHigh: totalHeight / headSize[1],
    shoulderWidthInHeads: torsoShoulderWidth / headSize[0],
    armLengthFraction: armLength / totalHeight,
    legLengthFraction: legLength / totalHeight,
    handHeightInHeads: handHeight / headSize[1],
    footLengthInHeads: footLength / headSize[1],
  };
}

function assertClose(failures, moldId, field, actual, expected) {
  const denominator = Math.max(Math.abs(expected), 0.0001);
  const delta = Math.abs(actual - expected) / denominator;
  if (delta > TOLERANCE) {
    failures.push(`${moldId} ${field}: expected ${expected.toFixed(4)}, measured ${actual.toFixed(4)} (${(delta * 100).toFixed(1)}% drift)`);
  }
}

const failures = [];
const moldIds = new Set(GENERATED_CHARACTER_MOLDS.map((mold) => mold.id));
const proportionIds = new Set(Object.keys(CHARACTER_MOLD_PROPORTIONS));

for (const moldId of moldIds) {
  if (!proportionIds.has(moldId)) failures.push(`${moldId} is missing from CHARACTER_MOLD_PROPORTIONS`);
}
for (const moldId of proportionIds) {
  if (!moldIds.has(moldId)) failures.push(`${moldId} has proportions but no generated mold`);
}

for (const mold of GENERATED_CHARACTER_MOLDS) {
  const expected = CHARACTER_MOLD_PROPORTIONS[mold.id];
  if (!expected) continue;

  for (const field of REQUIRED_FIELDS) {
    if (!Number.isFinite(expected[field])) {
      failures.push(`${mold.id} has invalid ${field}`);
    }
  }

  const measured = measureMold(mold);
  for (const field of REQUIRED_FIELDS) {
    assertClose(failures, mold.id, field, measured[field], expected[field]);
  }
}

if (failures.length > 0) {
  console.error('Character mold proportion checks failed:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Character mold proportion checks passed (${GENERATED_CHARACTER_MOLDS.length} molds, +/-${Math.round(TOLERANCE * 100)}%).`);
