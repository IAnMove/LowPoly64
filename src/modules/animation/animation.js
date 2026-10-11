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
      const values = trackDef.keyframes.map((kf) => kf.value[0] === 1);
      tracks.push(new THREE.BooleanKeyframeTrack(`${targetName}.visible`, times, values));
    }
  }

  if (tracks.length === 0) return null;

  const clip = new THREE.AnimationClip(animDef.name || 'animation', animDef.duration || -1, tracks);
  clip.userData = { loop: animDef.loop !== false };
  return clip;
}

const ADDITIVE_ROOT_VALUE_TYPES = new Set(['vector', 'number', 'quaternion']);

function isRootTrack(track, root) {
  const { nodeName } = THREE.PropertyBinding.parseTrackName(track.name);
  return !!nodeName && (nodeName === root.name || nodeName === root.uuid);
}

/**
 * Splits a clip for playback on a placed object. Tracks that drive the root
 * group itself (whole-object prop clips such as idle/topple/dance) were
 * compiled with absolute values taken when the template was instantiated at
 * the origin, so playing them as-is teleports the object back to the origin
 * and discards the user's rotation. Those tracks are returned as an additive
 * clip (deltas from their first frame) that layers on top of wherever the
 * object currently sits; every other track keeps its absolute values.
 * Neither returned clip shares tracks with the input, which stays untouched.
 */
export function splitRootTracksForPlayback(clip, root) {
  if (!clip || !root) return { partClip: clip || null, rootClip: null };
  const rootTracks = [];
  const partTracks = [];
  for (const track of clip.tracks) {
    if (isRootTrack(track, root) && ADDITIVE_ROOT_VALUE_TYPES.has(track.ValueTypeName)) rootTracks.push(track.clone());
    else partTracks.push(track);
  }
  if (rootTracks.length === 0) return { partClip: clip, rootClip: null };

  const rootClip = new THREE.AnimationClip(`${clip.name}__root`, clip.duration, rootTracks);
  THREE.AnimationUtils.makeClipAdditive(rootClip);
  rootClip.userData = { ...(clip.userData || {}) };
  const partClip = partTracks.length
    ? Object.assign(new THREE.AnimationClip(clip.name, clip.duration, partTracks), { userData: { ...(clip.userData || {}) } })
    : null;
  return { partClip, rootClip };
}

function getActiveActions() {
  if (Array.isArray(state.animationActions) && state.animationActions.length) return state.animationActions;
  return state.animationAction ? [state.animationAction] : [];
}

export function playAnimation(group, clipIndex = 0) {
  const clips = group.userData.animationClips;
  if (!clips || clips.length === 0) return;

  const clip = clips[clipIndex];
  if (!clip) return;

  // Stop current animation if any
  stopAnimation();

  const mixer = new THREE.AnimationMixer(group);
  const { partClip, rootClip } = splitRootTracksForPlayback(clip, group);
  const loopMode = clip.userData?.loop !== false ? THREE.LoopRepeat : THREE.LoopOnce;
  const actions = [partClip, rootClip].filter(Boolean).map((entry) => {
    const action = mixer.clipAction(entry);
    action.setLoop(loopMode);
    action.clampWhenFinished = true;
    action.play();
    return action;
  });

  state.animationMixer = mixer;
  state.animationAction = actions[0] || null;
  state.animationActions = actions;
  state.animationPlaying = true;
  state.animationClipIndex = clipIndex;
}

export function pauseAnimation() {
  const actions = getActiveActions();
  if (actions.length) {
    actions.forEach((action) => { action.paused = true; });
    state.animationPlaying = false;
  }
}

export function resumeAnimation() {
  const actions = getActiveActions();
  if (actions.length) {
    actions.forEach((action) => { action.paused = false; });
    state.animationPlaying = true;
  }
}

export function stopAnimation() {
  if (state.animationMixer) {
    // Deactivating every action restores the bound properties to the values
    // they had when playback started, so the object returns to its placement.
    state.animationMixer.stopAllAction();
    state.animationMixer = null;
  }
  state.animationAction = null;
  state.animationActions = [];
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
