import * as THREE from 'three';
import { state } from './state.js';

const _euler = new THREE.Euler();
const _quat = new THREE.Quaternion();

function eulerToQuaternionValues(rx, ry, rz) {
  _euler.set(rx, ry, rz);
  _quat.setFromEuler(_euler);
  return [_quat.x, _quat.y, _quat.z, _quat.w];
}

export function compileAnimation(animDef, group) {
  const tracks = [];

  for (const trackDef of animDef.tracks) {
    const targetName = trackDef.target;
    // Find node by userData.name in group
    let targetNode = null;
    group.traverse((child) => {
      if (child.userData.name === targetName || child.name === targetName) {
        targetNode = child;
      }
    });
    if (!targetNode) {
      console.warn(`Animation target "${targetName}" not found in group`);
      continue;
    }
    // Ensure node.name is set for Three.js track binding
    targetNode.name = targetName;

    const times = trackDef.keyframes.map((kf) => kf.time);

    // Interpolation mode: default "linear", also supports "smooth" (catmull-rom) and "step"
    const interpMode = trackDef.interpolation === 'step' ? THREE.InterpolateDiscrete
      : trackDef.interpolation === 'smooth' ? THREE.InterpolateSmooth
      : THREE.InterpolateLinear;

    if (trackDef.property === 'position') {
      const values = trackDef.keyframes.flatMap((kf) => kf.value);
      const track = new THREE.VectorKeyframeTrack(`${targetName}.position`, times, values, interpMode);
      tracks.push(track);
    } else if (trackDef.property === 'scale') {
      const values = trackDef.keyframes.flatMap((kf) => kf.value);
      const track = new THREE.VectorKeyframeTrack(`${targetName}.scale`, times, values, interpMode);
      tracks.push(track);
    } else if (trackDef.property === 'rotation') {
      const values = trackDef.keyframes.flatMap((kf) => eulerToQuaternionValues(...kf.value));
      // Quaternion tracks only support linear and step
      const quatInterp = interpMode === THREE.InterpolateDiscrete ? THREE.InterpolateDiscrete : THREE.InterpolateLinear;
      const track = new THREE.QuaternionKeyframeTrack(`${targetName}.quaternion`, times, values, quatInterp);
      tracks.push(track);
    } else if (trackDef.property === 'visible') {
      // Boolean visibility: value is [0] or [1]
      const values = trackDef.keyframes.map((kf) => kf.value[0] ? true : false);
      tracks.push(new THREE.BooleanKeyframeTrack(`${targetName}.visible`, times, values));
    }
  }

  if (tracks.length === 0) return null;

  const clip = new THREE.AnimationClip(animDef.name || 'animation', animDef.duration || -1, tracks);
  clip.userData = { loop: animDef.loop !== false };
  return clip;
}

export function playAnimation(group, clipIndex = 0) {
  const clips = group.userData.animationClips;
  if (!clips || clips.length === 0) return;

  const clip = clips[clipIndex];
  if (!clip) return;

  // Stop current animation if any
  stopAnimation();

  const mixer = new THREE.AnimationMixer(group);
  const action = mixer.clipAction(clip);
  action.setLoop(clip.userData?.loop !== false ? THREE.LoopRepeat : THREE.LoopOnce);
  action.clampWhenFinished = true;
  action.play();

  state.animationMixer = mixer;
  state.animationAction = action;
  state.animationPlaying = true;
  state.animationClipIndex = clipIndex;
}

export function pauseAnimation() {
  if (state.animationAction) {
    state.animationAction.paused = true;
    state.animationPlaying = false;
  }
}

export function resumeAnimation() {
  if (state.animationAction) {
    state.animationAction.paused = false;
    state.animationPlaying = true;
  }
}

export function stopAnimation() {
  if (state.animationMixer) {
    state.animationMixer.stopAllAction();
    state.animationMixer = null;
  }
  state.animationAction = null;
  state.animationPlaying = false;
}

export function togglePlayPause(group, clipIndex = 0) {
  // If a different clip is requested, stop current and play the new one
  if (state.animationPlaying && state.animationClipIndex !== clipIndex) {
    stopAnimation();
    playAnimation(group, clipIndex);
  } else if (state.animationPlaying) {
    pauseAnimation();
  } else if (state.animationAction && state.animationAction.paused && state.animationClipIndex === clipIndex) {
    resumeAnimation();
  } else {
    playAnimation(group, clipIndex);
  }
}

export function getAnimationProgress() {
  if (!state.animationAction || !state.animationAction.getClip()) return { time: 0, duration: 0 };
  const clip = state.animationAction.getClip();
  return {
    time: state.animationAction.time,
    duration: clip.duration,
  };
}

export function updateAnimationMixer(delta) {
  if (state.animationMixer && state.animationPlaying) {
    state.animationMixer.update(delta);
  }
}
