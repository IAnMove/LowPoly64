import * as THREE from 'three';

function getAnimationClip(group, clipIndex) {
  const clips = group?.userData?.animationClips;
  if (!clips || clips.length === 0) return null;
  return clips[clipIndex] || null;
}

export function playAnimationRuntime(animationState, group, clipIndex = 0, {
  AnimationMixerClass = THREE.AnimationMixer,
  loopRepeat = THREE.LoopRepeat,
  loopOnce = THREE.LoopOnce,
} = {}) {
  const clip = getAnimationClip(group, clipIndex);
  if (!clip) return false;

  stopAnimationRuntime(animationState);

  const mixer = new AnimationMixerClass(group);
  const action = mixer.clipAction(clip);
  action.setLoop(clip.userData?.loop !== false ? loopRepeat : loopOnce);
  action.clampWhenFinished = true;
  action.play();

  animationState.animationMixer = mixer;
  animationState.animationAction = action;
  animationState.animationPlaying = true;
  animationState.animationClipIndex = clipIndex;
  return true;
}

export function pauseAnimationRuntime(animationState) {
  if (!animationState.animationAction) return false;

  animationState.animationAction.paused = true;
  animationState.animationPlaying = false;
  return true;
}

export function resumeAnimationRuntime(animationState) {
  if (!animationState.animationAction) return false;

  animationState.animationAction.paused = false;
  animationState.animationPlaying = true;
  return true;
}

export function stopAnimationRuntime(animationState) {
  if (animationState.animationMixer) {
    animationState.animationMixer.stopAllAction();
    animationState.animationMixer = null;
  }
  animationState.animationAction = null;
  animationState.animationPlaying = false;
  return true;
}

export function togglePlayPauseRuntime(animationState, group, clipIndex = 0, {
  playAnimation = playAnimationRuntime,
  pauseAnimation = pauseAnimationRuntime,
  resumeAnimation = resumeAnimationRuntime,
  stopAnimation = stopAnimationRuntime,
} = {}) {
  if (animationState.animationPlaying && animationState.animationClipIndex !== clipIndex) {
    stopAnimation(animationState);
    return playAnimation(animationState, group, clipIndex);
  }

  if (animationState.animationPlaying) {
    return pauseAnimation(animationState);
  }

  if (
    animationState.animationAction
    && animationState.animationAction.paused
    && animationState.animationClipIndex === clipIndex
  ) {
    return resumeAnimation(animationState);
  }

  return playAnimation(animationState, group, clipIndex);
}

export function getAnimationProgressRuntime(animationState) {
  if (!animationState.animationAction || !animationState.animationAction.getClip()) {
    return { time: 0, duration: 0 };
  }

  const clip = animationState.animationAction.getClip();
  return {
    time: animationState.animationAction.time,
    duration: clip.duration,
  };
}

export function updateAnimationMixerRuntime(animationState, delta) {
  if (!animationState.animationMixer || !animationState.animationPlaying) return false;

  animationState.animationMixer.update(delta);
  return true;
}
