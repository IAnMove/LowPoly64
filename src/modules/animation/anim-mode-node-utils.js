export function buildNamedNodeLookup(group) {
  const lookup = new Map();
  group?.traverse?.((node) => {
    const name = String(node?.userData?.name || node?.name || '').trim();
    if (name && !lookup.has(name)) {
      lookup.set(name, node);
    }
  });
  return lookup;
}

function getPoseSnapshotName(node) {
  return String(node?.userData?.name || node?.name || '').trim();
}

export function captureGroupLocalPoseSnapshot(group) {
  const snapshot = new Map();
  group?.traverse?.((node) => {
    const name = getPoseSnapshotName(node);
    if (!name) return;
    snapshot.set(name, {
      position: node.position?.clone?.(),
      quaternion: node.quaternion?.clone?.(),
      scale: node.scale?.clone?.(),
    });
  });
  return snapshot;
}

export function ensureAnimModeRestPoseSnapshot(group) {
  if (!group?.userData) return new Map();
  if (!(group.userData.animModeRestPoseSnapshot instanceof Map)) {
    group.userData.animModeRestPoseSnapshot = captureGroupLocalPoseSnapshot(group);
  }
  return group.userData.animModeRestPoseSnapshot;
}

export function restoreGroupLocalPoseSnapshot(group, snapshot = ensureAnimModeRestPoseSnapshot(group)) {
  group?.traverse?.((node) => {
    const name = getPoseSnapshotName(node);
    const transform = name ? snapshot.get(name) : null;
    if (!transform) return;
    if (transform.position) node.position.copy(transform.position);
    if (transform.quaternion) node.quaternion.copy(transform.quaternion);
    if (transform.scale) node.scale.copy(transform.scale);
  });
  group?.updateMatrixWorld?.(true);
}
