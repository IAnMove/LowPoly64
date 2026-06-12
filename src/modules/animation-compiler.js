import * as THREE from 'three';

function findAnimationTarget(group, targetName) {
  let targetNode = null;
  group.traverse((child) => {
    if (child.userData.name === targetName || child.name === targetName) {
      targetNode = child;
    }
  });
  return targetNode;
}

function getInterpolationMode(trackDefinition) {
  if (trackDefinition.interpolation === 'step') return THREE.InterpolateDiscrete;
  if (trackDefinition.interpolation === 'smooth') return THREE.InterpolateSmooth;
  return THREE.InterpolateLinear;
}

export function compileAnimation(animDef, group) {
  const tracks = [];

  for (const trackDef of animDef.tracks) {
    const targetName = trackDef.target;
    const targetNode = findAnimationTarget(group, targetName);
    if (!targetNode) {
      console.warn(`Animation target "${targetName}" not found in group`);
      continue;
    }

    targetNode.name = targetName;
    const times = trackDef.keyframes.map((keyframe) => keyframe.time);
    const interpolation = getInterpolationMode(trackDef);

    if (trackDef.property === 'position') {
      const values = trackDef.keyframes.flatMap((keyframe) => keyframe.value);
      tracks.push(new THREE.VectorKeyframeTrack(`${targetName}.position`, times, values, interpolation));
    } else if (trackDef.property === 'scale') {
      const values = trackDef.keyframes.flatMap((keyframe) => keyframe.value);
      tracks.push(new THREE.VectorKeyframeTrack(`${targetName}.scale`, times, values, interpolation));
    } else if (trackDef.property === 'rotation') {
      const xValues = trackDef.keyframes.map((keyframe) => keyframe.value[0]);
      const yValues = trackDef.keyframes.map((keyframe) => keyframe.value[1]);
      const zValues = trackDef.keyframes.map((keyframe) => keyframe.value[2]);
      tracks.push(new THREE.NumberKeyframeTrack(`${targetName}.rotation[x]`, times, xValues, interpolation));
      tracks.push(new THREE.NumberKeyframeTrack(`${targetName}.rotation[y]`, times, yValues, interpolation));
      tracks.push(new THREE.NumberKeyframeTrack(`${targetName}.rotation[z]`, times, zValues, interpolation));
    } else if (trackDef.property === 'visible') {
      const values = trackDef.keyframes.map((keyframe) => Boolean(keyframe.value[0]));
      tracks.push(new THREE.BooleanKeyframeTrack(`${targetName}.visible`, times, values));
    }
  }

  if (tracks.length === 0) return null;

  const clip = new THREE.AnimationClip(animDef.name || 'animation', animDef.duration || -1, tracks);
  clip.userData = { loop: animDef.loop !== false };
  return clip;
}
