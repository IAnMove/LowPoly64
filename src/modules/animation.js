import { createBrowserAnimationController } from './animation-browser-adapter.js';

export { compileAnimation } from './animation-compiler.js';

const animationController = createBrowserAnimationController();

export function playAnimation(group, clipIndex = 0) {
  return animationController.playAnimation(group, clipIndex);
}

export function pauseAnimation() {
  return animationController.pauseAnimation();
}

export function resumeAnimation() {
  return animationController.resumeAnimation();
}

export function stopAnimation() {
  return animationController.stopAnimation();
}

export function togglePlayPause(group, clipIndex = 0) {
  return animationController.togglePlayPause(group, clipIndex);
}

export function getAnimationProgress() {
  return animationController.getAnimationProgress();
}

export function updateAnimationMixer(delta) {
  return animationController.updateAnimationMixer(delta);
}
