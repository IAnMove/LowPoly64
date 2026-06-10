import * as THREE from 'three';

const RIG_PREVIEW_BONE_GEO = new THREE.SphereGeometry(0.12, 6, 4);
const RIG_PREVIEW_BONE_MAT = new THREE.MeshBasicMaterial({
  color: 0x00ffff,
  wireframe: true,
  depthTest: false,
});
const RIG_PREVIEW_LINE_MAT = new THREE.LineBasicMaterial({
  color: 0x00ffff,
  depthTest: false,
});

export function computeSkeletonWorldPositions(skeleton) {
  const boneLookup = new Map((skeleton?.bones || []).map((bone) => [bone.name, bone]));
  const result = new Map();

  function resolveBonePosition(name) {
    if (result.has(name)) {
      return result.get(name).clone();
    }

    const bone = boneLookup.get(name);
    if (!bone) return null;

    const position = new THREE.Vector3(...(bone.position || [0, 0, 0]));
    if (bone.parent) {
      const parentPosition = resolveBonePosition(bone.parent);
      if (parentPosition) {
        position.add(parentPosition);
      }
    }

    result.set(name, position.clone());
    return position;
  }

  (skeleton?.bones || []).forEach((bone) => resolveBonePosition(bone.name));
  return result;
}

export function buildRigPreviewHelper(skeleton, restWorldPositions) {
  const helperGroup = new THREE.Group();
  const boneEntries = [];
  const lineEntries = [];
  const entryLookup = new Map();

  (skeleton?.bones || []).forEach((bone) => {
    const node = new THREE.Group();
    node.name = bone.name;
    node.userData.name = bone.name;

    const sphere = new THREE.Mesh(RIG_PREVIEW_BONE_GEO, RIG_PREVIEW_BONE_MAT.clone());
    sphere.renderOrder = 999;
    node.add(sphere);

    const restPosition = restWorldPositions.get(bone.name)?.clone() || new THREE.Vector3();
    node.position.copy(restPosition);
    helperGroup.add(node);

    const entry = { bone, node, sphere, restPosition };
    boneEntries.push(entry);
    entryLookup.set(bone.name, entry);
  });

  (skeleton?.bones || []).forEach((bone) => {
    if (!bone.parent) return;

    const childEntry = entryLookup.get(bone.name);
    const parentEntry = entryLookup.get(bone.parent);
    if (!childEntry || !parentEntry) return;

    const geometry = new THREE.BufferGeometry().setFromPoints([
      parentEntry.node.position.clone(),
      childEntry.node.position.clone(),
    ]);
    const line = new THREE.Line(geometry, RIG_PREVIEW_LINE_MAT.clone());
    line.renderOrder = 998;
    helperGroup.add(line);
    lineEntries.push({ parentEntry, childEntry, line });
  });

  return { helperGroup, boneEntries, lineEntries };
}
