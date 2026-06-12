import {
  getAnimationProgressRuntime,
  pauseAnimationRuntime,
  playAnimationRuntime,
  resumeAnimationRuntime,
  stopAnimationRuntime,
  togglePlayPauseRuntime,
  updateAnimationMixerRuntime,
} from './animation-runtime.js';

export function createAnimationController({
  getAnimationState = () => ({}),
  playAnimationCommand = playAnimationRuntime,
  pauseAnimationCommand = pauseAnimationRuntime,
  resumeAnimationCommand = resumeAnimationRuntime,
  stopAnimationCommand = stopAnimationRuntime,
  togglePlayPauseCommand = togglePlayPauseRuntime,
  getAnimationProgressCommand = getAnimationProgressRuntime,
  updateAnimationMixerCommand = updateAnimationMixerRuntime,
} = {}) {
  function playAnimation(group, clipIndex = 0) {
    return playAnimationCommand(getAnimationState(), group, clipIndex);
  }

  function pauseAnimation() {
    return pauseAnimationCommand(getAnimationState());
  }

  function resumeAnimation() {
    return resumeAnimationCommand(getAnimationState());
  }

  function stopAnimation() {
    return stopAnimationCommand(getAnimationState());
  }

  function togglePlayPause(group, clipIndex = 0) {
    return togglePlayPauseCommand(getAnimationState(), group, clipIndex);
  }

  function getAnimationProgress() {
    return getAnimationProgressCommand(getAnimationState());
  }

  function updateAnimationMixer(delta) {
    return updateAnimationMixerCommand(getAnimationState(), delta);
  }

  return {
    getAnimationProgress,
    pauseAnimation,
    playAnimation,
    resumeAnimation,
    stopAnimation,
    togglePlayPause,
    updateAnimationMixer,
  };
}
