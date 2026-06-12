import * as THREE from 'three';
import { createTemplateGeometry } from './template-geometry.js';

function getAbsolutePositionInGroup(node, rootGroup) {
  const position = new THREE.Vector3();
  let current = node;
  while (current && current !== rootGroup) {
    position.add(current.position);
    current = current.parent;
  }
  return position;
}

function getPivotDepth(node) {
  let depth = 0;
  let ancestor = node;
  while (ancestor?.userData?.isPivot) {
    depth++;
    ancestor = ancestor.parent?.userData?.isPivot ? ancestor.parent : null;
  }
  return depth;
}

export function buildTemplateGroupFromDefinition(def, {
  compileAnimations = true,
  compileAnimation = null,
  createGeometry = createTemplateGeometry,
  createMaterial,
  materialType = 'Lambert',
  warn = console.warn,
} = {}) {
  if (typeof createMaterial !== 'function') {
    throw new Error('buildTemplateGroupFromDefinition requires createMaterial');
  }

  const group = new THREE.Group();
  group.userData.name = def.name || 'GROUP';

  const pivotMap = new Map();
  const pieces = def.pieces || [];

  pieces.forEach((piece, index) => {
    const geometryType = piece.geometry?.type;
    const geometry = createGeometry(geometryType, piece.geometry?.params || {});
    if (!geometry) {
      warn(`Unknown geometry type: ${geometryType}`);
      return;
    }

    const pieceName = piece.name || `PIECE_${index + 1}`;
    const position = piece.position || [0, 0, 0];
    const pivot = piece.pivot || position;

    const pivotGroup = new THREE.Group();
    pivotGroup.userData.name = pieceName;
    pivotGroup.userData.isPivot = true;
    pivotGroup.name = pieceName;
    pivotGroup.position.set(pivot[0], pivot[1], pivot[2]);

    const material = createMaterial(materialType, { color: piece.color || '#ffcc00' });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData.geometryType = geometryType;
    mesh.position.set(
      position[0] - pivot[0],
      position[1] - pivot[1],
      position[2] - pivot[2]
    );

    if (piece.rotation) {
      pivotGroup.rotation.set(piece.rotation[0], piece.rotation[1], piece.rotation[2]);
    }
    if (piece.scale) {
      pivotGroup.scale.set(piece.scale[0], piece.scale[1], piece.scale[2]);
    }

    pivotGroup.add(mesh);
    group.add(pivotGroup);
    pivotMap.set(pieceName, pivotGroup);
  });

  pieces.forEach((piece) => {
    if (!piece.parent) return;

    const child = pivotMap.get(piece.name);
    const parent = pivotMap.get(piece.parent);
    if (!child || !parent) {
      if (!parent) warn(`Parent "${piece.parent}" not found for piece "${piece.name}"`);
      return;
    }
    if (getPivotDepth(parent) >= 8) {
      warn(`Nesting too deep for piece "${piece.name}", max 8 levels. Skipping re-parent.`);
      return;
    }

    const childAbsolutePosition = child.position.clone();
    const parentAbsolutePosition = getAbsolutePositionInGroup(parent, group);
    group.remove(child);
    parent.add(child);
    child.position.copy(childAbsolutePosition).sub(parentAbsolutePosition);
  });

  if (
    compileAnimations
    && typeof compileAnimation === 'function'
    && Array.isArray(def.animations)
    && def.animations.length > 0
  ) {
    group.userData.animations = def.animations.map((animation) => ({ ...animation }));
    group.userData.animationClips = group.userData.animations
      .map((animationDefinition) => compileAnimation(animationDefinition, group))
      .filter(Boolean);
  }

  return group;
}
