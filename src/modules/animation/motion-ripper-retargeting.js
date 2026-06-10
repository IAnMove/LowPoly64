import * as THREE from 'three';
import {
  CAPTURE_JOINTS,
  CAPTURE_SEGMENT_CHILDREN,
  HUMANOID_CAPTURE_SKELETON_ID,
} from './motion-ripper-constants.js';
import { unwrapEulerAngle } from './motion-ripper-constraints.js';
import {
  buildSkeletonWorldPositionMap,
  getVectorBounds,
  roundSkeletonValue,
  vectorToRoundedArray,
} from './motion-ripper-skeleton-utils.js';

function cloneJsonValue(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function vectorToArray(vector) {
  return [
    vector?.x ?? 0,
    vector?.y ?? 0,
    vector?.z ?? 0,
  ];
}

export function retimeAnimationDefinition(animDef, speedMultiplier = 1) {
  const clampedSpeed = Number.isFinite(speedMultiplier) && speedMultiplier > 0 ? speedMultiplier : 1;
  if (!animDef || Math.abs(clampedSpeed - 1) < 1e-6) {
    return animDef;
  }

  return {
    ...animDef,
    duration: (animDef.duration || 0) / clampedSpeed,
    tracks: (animDef.tracks || []).map((track) => ({
      ...track,
      keyframes: (track.keyframes || []).map((keyframe) => ({
        ...keyframe,
        time: keyframe.time / clampedSpeed,
        value: Array.isArray(keyframe?.value) ? [...keyframe.value] : keyframe?.value,
      })),
    })),
  };
}

function applyFacingYawToRootDelta(delta, group, captureFacingYaw = 0) {
  const targetFacingYaw = Number.isFinite(group?.userData?.defaultFacingYaw)
    ? group.userData.defaultFacingYaw
    : (Number.isFinite(group?.rotation?.y) ? group.rotation.y : 0);
  const facingYaw = captureFacingYaw + targetFacingYaw;

  if (Math.abs(facingYaw) < 1e-6) {
    return delta;
  }

  return delta.applyAxisAngle(new THREE.Vector3(0, 1, 0), facingYaw);
}

function rotationTrackValueToQuaternion(value) {
  if (Array.isArray(value) && value.length >= 4) {
    return new THREE.Quaternion(
      value[0] ?? 0,
      value[1] ?? 0,
      value[2] ?? 0,
      value[3] ?? 1
    ).normalize();
  }
  if (Array.isArray(value) && value.length >= 3) {
    return new THREE.Quaternion().setFromEuler(new THREE.Euler(
      value[0] ?? 0,
      value[1] ?? 0,
      value[2] ?? 0,
      'XYZ'
    )).normalize();
  }
  return new THREE.Quaternion();
}

function quaternionToRotationTrackValue(quaternion, previousValue = null) {
  const euler = new THREE.Euler().setFromQuaternion(quaternion, 'XYZ');
  const value = [euler.x, euler.y, euler.z];
  if (!Array.isArray(previousValue)) return value;
  return value.map((axisValue, axis) => unwrapEulerAngle(axisValue, previousValue[axis]));
}

function getTargetRestQuaternion(group, targetName, targetNode) {
  const restSnapshot = group?.userData?.animModeRestPoseSnapshot;
  const restTransform = restSnapshot instanceof Map ? restSnapshot.get(targetName) : null;
  const quaternion = restTransform?.quaternion?.clone?.()
    || targetNode?.quaternion?.clone?.()
    || new THREE.Quaternion();
  return quaternion.normalize();
}

function shouldUseIdentityRotationReference(track, animDef) {
  const firstValue = track?.keyframes?.[0]?.value;
  return track?.rotationSpace === 'rest-delta'
    || (
      animDef?.source === 'motion-ripper'
      && Array.isArray(firstValue)
      && firstValue.length <= 3
    );
}

function retargetRotationTrackForTarget(track, targetName, restQuaternion, options = {}) {
  const sourceKeyframes = track.keyframes || [];
  if (sourceKeyframes.length === 0) return null;

  const referenceQuaternion = options.useIdentityReference
    ? new THREE.Quaternion()
    : rotationTrackValueToQuaternion(sourceKeyframes[0]?.value);
  const inverseReferenceQuaternion = referenceQuaternion.clone().invert();
  let previousValue = null;

  return {
    ...track,
    target: targetName,
    property: 'rotation',
    keyframes: sourceKeyframes.map((keyframe) => {
      const sourceQuaternion = rotationTrackValueToQuaternion(keyframe.value);
      const deltaQuaternion = sourceQuaternion.multiply(inverseReferenceQuaternion).normalize();
      const retargetedQuaternion = restQuaternion.clone().multiply(deltaQuaternion).normalize();
      const value = quaternionToRotationTrackValue(retargetedQuaternion, previousValue);
      previousValue = value;
      return {
        ...keyframe,
        value,
      };
    }),
  };
}

function translateTrackForTarget(track, group, targetName, options = {}) {
  if (!targetName) return null;

  const keyframes = (track.keyframes || []).map((keyframe) => ({
    ...keyframe,
    value: Array.isArray(keyframe?.value) ? [...keyframe.value] : keyframe?.value,
  }));

  if (track.property === 'rotation') {
    const targetNode = options.findTargetNodeByName?.(group, targetName);
    if (!targetNode) return null;
    return retargetRotationTrackForTarget(
      { ...track, keyframes },
      targetName,
      getTargetRestQuaternion(group, targetName, targetNode),
      { useIdentityReference: !!options.useIdentityRotationReference }
    );
  }

  if (track.property !== 'position') {
    return {
      ...track,
      target: targetName,
      keyframes,
    };
  }

  if (!options.isRootTrack) {
    return null;
  }

  const targetNode = options.findTargetNodeByName?.(group, targetName);
  if (!targetNode) return null;

  const rest = keyframes[0]?.value || [0, 0, 0];
  const base = targetNode.position;
  const applyFacingYaw = !!options.applyFacingYaw;
  const rootMotionScale = Number.isFinite(options.rootMotionScale) ? options.rootMotionScale : 1;
  return {
    ...track,
    target: targetName,
    keyframes: keyframes.map((keyframe) => ({
      ...keyframe,
      value: (() => {
        const delta = new THREE.Vector3(
          (keyframe.value?.[0] ?? 0) - (rest[0] ?? 0),
          (keyframe.value?.[1] ?? 0) - (rest[1] ?? 0),
          (keyframe.value?.[2] ?? 0) - (rest[2] ?? 0)
        ).multiplyScalar(rootMotionScale);
        const translatedDelta = applyFacingYaw
          ? applyFacingYawToRootDelta(delta, group, options.captureFacingYaw)
          : delta;
        return [
          base.x + translatedDelta.x,
          base.y + translatedDelta.y,
          base.z + translatedDelta.z,
        ];
      })(),
    })),
  };
}

export function getGroupTargetVectors(group, targetConfig, { findTargetNodeByName } = {}) {
  if (!group?.isGroup) return {};
  group.updateWorldMatrix(true, true);
  const vectors = {};

  CAPTURE_JOINTS.forEach((jointName) => {
    const targetName = targetConfig?.animationTargets?.[jointName];
    const node = targetName ? findTargetNodeByName?.(group, targetName) : null;
    if (!node) return;

    const position = new THREE.Vector3();
    node.getWorldPosition(position);
    group.worldToLocal(position);
    vectors[jointName] = position;
  });

  return vectors;
}

function resolveCaptureRigFit(sourceSkeleton, targetVectorsByJoint) {
  const sourceWorldByJoint = buildSkeletonWorldPositionMap(sourceSkeleton);
  const sourcePelvis = sourceWorldByJoint.get('PELVIS') || new THREE.Vector3();
  const targetPelvis = targetVectorsByJoint.PELVIS || targetVectorsByJoint.CHEST || new THREE.Vector3();
  const joints = CAPTURE_JOINTS.filter((jointName) => sourceWorldByJoint.has(jointName) && targetVectorsByJoint[jointName]);
  const sourceBounds = getVectorBounds(joints.map((jointName) => sourceWorldByJoint.get(jointName)));
  const targetBounds = getVectorBounds(joints.map((jointName) => targetVectorsByJoint[jointName]));
  const sourceHeight = sourceBounds?.size?.y || 0;
  const targetHeight = targetBounds?.size?.y || 0;
  const scale = sourceHeight > 1e-6 && targetHeight > 1e-6 ? targetHeight / sourceHeight : 1;
  const fitted = {};

  CAPTURE_JOINTS.forEach((jointName) => {
    const source = sourceWorldByJoint.get(jointName);
    if (!source) return;
    fitted[jointName] = source.clone().sub(sourcePelvis).multiplyScalar(scale).add(targetPelvis);
  });

  return { fitted, scale };
}

export function translateCapturedAnimationForGroup(animDef, group, targetConfig, options = {}) {
  const tracks = [];
  const targetVectors = getGroupTargetVectors(group, targetConfig, options);
  const rootMotionScale = animDef?.sourceSkeleton
    ? resolveCaptureRigFit(animDef.sourceSkeleton, targetVectors).scale
    : 1;

  for (const track of animDef?.tracks || []) {
    if (!track) continue;

    let targetName = null;
    const isRootMotionTrack = (track.target === 'PELVIS' || track.target === 'ROOT') && track.property === 'position';

    if (isRootMotionTrack) {
      targetName = targetConfig.rootMotionTargetName;
    } else if (track.target === 'ROOT') {
      continue;
    } else if (targetConfig.suppressedBones.has(track.target)) {
      continue;
    } else {
      targetName = targetConfig.animationTargets[track.target];
    }

    const translatedTrack = translateTrackForTarget(track, group, targetName, {
      ...options,
      applyFacingYaw: isRootMotionTrack,
      isRootTrack: isRootMotionTrack,
      useIdentityRotationReference: shouldUseIdentityRotationReference(track, animDef),
      rootMotionScale: isRootMotionTrack ? rootMotionScale : 1,
    });
    if (translatedTrack) {
      tracks.push(translatedTrack);
    }
  }

  if (tracks.length === 0) return null;

  return {
    ...animDef,
    tracks,
    name: animDef.name,
    duration: animDef.duration,
    loop: animDef.loop,
    source: animDef.source,
    sourceSkeletonId: animDef.sourceSkeletonId,
    sourceAuthor: 'ilatroce',
  };
}

function toVector3FromArray(value) {
  return Array.isArray(value) && value.length === 3
    ? new THREE.Vector3(value[0] || 0, value[1] || 0, value[2] || 0)
    : null;
}

function getSerializedPieceVector(piece) {
  return toVector3FromArray(piece?.pivot) || toVector3FromArray(piece?.position);
}

function buildSerializedTargetVectors(serializedGroup, targetConfig) {
  const piecesByName = new Map((serializedGroup?.pieces || []).map((piece) => [piece.name, piece]));
  const vectors = {};

  CAPTURE_JOINTS.forEach((jointName) => {
    const targetName = targetConfig?.animationTargets?.[jointName];
    const piece = targetName ? piecesByName.get(targetName) : null;
    const vector = getSerializedPieceVector(piece);
    if (vector) vectors[jointName] = vector;
  });

  return vectors;
}

function getCaptureDisplayPosition(jointName, piece, fittedPositions) {
  const own = fittedPositions[jointName];
  if (!own) return null;

  if (jointName === 'HEAD') {
    return own.clone();
  }

  const childName = CAPTURE_SEGMENT_CHILDREN[jointName];
  const child = childName ? fittedPositions[childName] : null;
  if (child && piece?.geometry?.type !== 'label') {
    return own.clone().lerp(child, 0.5);
  }

  const oldPosition = toVector3FromArray(piece?.position);
  const oldPivot = toVector3FromArray(piece?.pivot);
  if (oldPosition && oldPivot && piece?.geometry?.type !== 'label') {
    return own.clone().add(oldPosition.sub(oldPivot));
  }

  return own.clone();
}

function getCapturePivotPosition(jointName, fittedPositions) {
  if (jointName === 'HEAD') {
    return fittedPositions.NECK || fittedPositions.HEAD || null;
  }
  return fittedPositions[jointName] || null;
}

export function applyCapturedSkeletonToSerializedGroup(serializedGroup, sourceSkeleton, targetConfig) {
  if (!serializedGroup || !Array.isArray(serializedGroup.pieces) || !sourceSkeleton?.bones?.length) {
    return false;
  }

  const piecesByName = new Map(serializedGroup.pieces.map((piece) => [piece.name, piece]));
  const targetVectors = buildSerializedTargetVectors(serializedGroup, targetConfig);
  const { fitted, scale } = resolveCaptureRigFit(sourceSkeleton, targetVectors);
  let changed = false;

  CAPTURE_JOINTS.forEach((jointName) => {
    const targetName = targetConfig?.animationTargets?.[jointName];
    const piece = targetName ? piecesByName.get(targetName) : null;
    if (!piece) return;

    const pivot = getCapturePivotPosition(jointName, fitted);
    const position = getCaptureDisplayPosition(jointName, piece, fitted);
    if (!pivot || !position) return;

    piece.pivot = vectorToRoundedArray(pivot);
    piece.position = vectorToRoundedArray(position);
    changed = true;
  });

  if (changed) {
    serializedGroup.skeletonId = sourceSkeleton.id || HUMANOID_CAPTURE_SKELETON_ID;
    serializedGroup.animationProfile = null;
    if (sourceSkeleton.defaultBindings && typeof sourceSkeleton.defaultBindings === 'object') {
      serializedGroup.slotBindings = cloneJsonValue(sourceSkeleton.defaultBindings);
    }
    serializedGroup.captureRigApplied = {
      sourceSkeletonId: sourceSkeleton.id || HUMANOID_CAPTURE_SKELETON_ID,
      scale: roundSkeletonValue(scale),
    };
  }
  return changed;
}

function setNodeRootPosition(group, node, rootPosition) {
  if (!group || !node || !rootPosition) return;
  group.updateWorldMatrix(true, true);
  const worldPosition = group.localToWorld(rootPosition.clone());
  const localPosition = node.parent
    ? node.parent.worldToLocal(worldPosition)
    : worldPosition;
  node.position.copy(localPosition);
}

function setPivotMeshDisplayPosition(group, node, rootPosition) {
  const mesh = node?.children?.find((child) => child?.isMesh);
  if (!group || !node || !mesh || !rootPosition) return;
  group.updateWorldMatrix(true, true);
  node.updateWorldMatrix(true, false);
  const worldPosition = group.localToWorld(rootPosition.clone());
  mesh.position.copy(node.worldToLocal(worldPosition));
}

export function applyCapturedSkeletonToGroup(group, sourceSkeleton, targetConfig, options = {}) {
  if (!group?.isGroup || !sourceSkeleton?.bones?.length) return false;

  const targetVectors = getGroupTargetVectors(group, targetConfig, options);
  const { fitted, scale } = resolveCaptureRigFit(sourceSkeleton, targetVectors);
  let changed = false;

  CAPTURE_JOINTS.forEach((jointName) => {
    const targetName = targetConfig?.animationTargets?.[jointName];
    const node = targetName ? options.findTargetNodeByName?.(group, targetName) : null;
    if (!node) return;

    const pivot = getCapturePivotPosition(jointName, fitted);
    const position = getCaptureDisplayPosition(jointName, {
      geometry: { type: node.userData?.geometryType || 'label' },
      position: vectorToArray(node.position),
      pivot: vectorToArray(node.position),
    }, fitted);
    if (!pivot) return;

    setNodeRootPosition(group, node, pivot);
    if (position) setPivotMeshDisplayPosition(group, node, position);
    changed = true;
  });

  if (changed) {
    group.userData.skeletonId = sourceSkeleton.id || HUMANOID_CAPTURE_SKELETON_ID;
    group.userData.animationProfile = null;
    if (sourceSkeleton.defaultBindings && typeof sourceSkeleton.defaultBindings === 'object') {
      group.userData.slotBindings = cloneJsonValue(sourceSkeleton.defaultBindings);
    }
    group.userData.captureRigApplied = {
      sourceSkeletonId: sourceSkeleton.id || HUMANOID_CAPTURE_SKELETON_ID,
      scale: roundSkeletonValue(scale),
    };
    group.updateMatrixWorld(true);
  }
  return changed;
}
