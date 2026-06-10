import * as THREE from 'three';

const TEMPLATE_SPAWN_CELL_SIZE = 6;
const TEMPLATE_SPAWN_PADDING = 1.25;
const TEMPLATE_SPAWN_MAX_RING = 12;

function measureObjectFootprintRadius(object) {
  if (!object) {
    return TEMPLATE_SPAWN_CELL_SIZE * 0.45;
  }

  object.updateWorldMatrix(true, true);
  const box = new THREE.Box3().setFromObject(object);
  if (box.isEmpty()) {
    return TEMPLATE_SPAWN_CELL_SIZE * 0.45;
  }

  const size = new THREE.Vector3();
  box.getSize(size);
  const radius = (Math.max(size.x, size.z) * 0.5) + TEMPLATE_SPAWN_PADDING;
  return Math.max(radius, TEMPLATE_SPAWN_CELL_SIZE * 0.45);
}

function buildSpawnCandidates() {
  const candidates = [new THREE.Vector3(0, 0, 0)];

  for (let ring = 1; ring <= TEMPLATE_SPAWN_MAX_RING; ring += 1) {
    for (let gridX = -ring; gridX <= ring; gridX += 1) {
      for (let gridZ = -ring; gridZ <= ring; gridZ += 1) {
        const onPerimeter = Math.abs(gridX) === ring || Math.abs(gridZ) === ring;
        if (!onPerimeter) continue;
        candidates.push(new THREE.Vector3(
          gridX * TEMPLATE_SPAWN_CELL_SIZE,
          0,
          gridZ * TEMPLATE_SPAWN_CELL_SIZE
        ));
      }
    }
  }

  return candidates;
}

export function findTemplateSpawnPosition(group, userObjects = []) {
  const candidateRadius = measureObjectFootprintRadius(group);
  const occupied = userObjects
    .filter((child) => child && child !== group)
    .map((child) => ({
      position: child.position.clone(),
      radius: measureObjectFootprintRadius(child),
    }));

  const candidates = buildSpawnCandidates();
  for (const candidate of candidates) {
    const collides = occupied.some((entry) => {
      const dx = candidate.x - entry.position.x;
      const dz = candidate.z - entry.position.z;
      const minDistance = candidateRadius + entry.radius;
      return (dx * dx) + (dz * dz) < (minDistance * minDistance);
    });
    if (!collides) {
      return candidate;
    }
  }

  const fallbackOffset = (occupied.length + 1) * TEMPLATE_SPAWN_CELL_SIZE;
  return new THREE.Vector3(fallbackOffset, 0, 0);
}
