function findTargetNode(group, targetName) {
  let targetNode = null;
  group.traverse((child) => {
    if (!targetNode && (child.userData?.name === targetName || child.name === targetName)) {
      targetNode = child;
    }
  });
  return targetNode;
}

export function buildBoneToTargetMap(group, slotMap = {}, slotBindings = {}, { wholeGroupSlots = [] } = {}) {
  const map = {};
  const groupTarget = group?.userData?.name || group?.name || 'GROUP';
  const wholeGroupSlotSet = new Set(wholeGroupSlots);
  const archetype = group?.userData?.archetype || null;

  for (const [slotId, boneNames] of Object.entries(slotBindings || {})) {
    const pieces = slotMap?.[slotId] || [];
    let defaultTargetName = null;

    if (wholeGroupSlotSet.has(slotId)) {
      defaultTargetName = groupTarget;
    } else if (slotId === 'BODY' && (archetype === 'PROP' || archetype === 'CAR')) {
      // For whole-object props, animating the root group is usually the right default.
      defaultTargetName = groupTarget;
    } else {
      if (pieces.length > 0) defaultTargetName = pieces[0];
    }

    for (const boneName of boneNames || []) {
      if (pieces.includes(boneName)) {
        map[boneName] = boneName;
      } else if (defaultTargetName) {
        map[boneName] = defaultTargetName;
      }
    }
  }

  return map;
}

export function translateAnimForMesh(animDef, group, boneToTarget) {
  const tracks = [];

  for (const track of animDef?.tracks || []) {
    const targetName = boneToTarget?.[track.target];
    if (!targetName) continue;

    if (track.property !== 'position') {
      tracks.push({ ...track, target: targetName });
      continue;
    }

    const targetNode = findTargetNode(group, targetName);
    if (!targetNode) continue;

    const rest = track.keyframes?.[0]?.value || [0, 0, 0];
    const base = targetNode.position;
    tracks.push({
      ...track,
      target: targetName,
      keyframes: (track.keyframes || []).map((kf) => ({
        time: kf.time,
        value: [
          base.x + (kf.value[0] - rest[0]),
          base.y + (kf.value[1] - rest[1]),
          base.z + (kf.value[2] - rest[2]),
        ],
      })),
    });
  }

  return tracks.length > 0 ? { ...animDef, tracks } : null;
}
