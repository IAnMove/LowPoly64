import * as THREE from 'three';
import { state } from '../shared/state.js';

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
      // Use per-axis Euler tracks so continuous rotations (e.g. 0→2π spin) work correctly.
      // Quaternion interpolation takes the shortest path, collapsing full rotations to zero.
      const xVals = trackDef.keyframes.map((kf) => kf.value[0]);
      const yVals = trackDef.keyframes.map((kf) => kf.value[1]);
      const zVals = trackDef.keyframes.map((kf) => kf.value[2]);
      tracks.push(new THREE.NumberKeyframeTrack(`${targetName}.rotation[x]`, times, xVals, interpMode));
      tracks.push(new THREE.NumberKeyframeTrack(`${targetName}.rotation[y]`, times, yVals, interpMode));
      tracks.push(new THREE.NumberKeyframeTrack(`${targetName}.rotation[z]`, times, zVals, interpMode));
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
