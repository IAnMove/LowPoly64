import { createBrowserAnimationPanel } from './animation-panel-browser-adapter.js';

const animationPanel = createBrowserAnimationPanel();

export function playAnim() {
  return animationPanel.playAnim();
}

export function stopAnim() {
  return animationPanel.stopAnim();
}

export function onAnimSelectChange() {
  return animationPanel.onAnimSelectChange();
}

export function toggleAnimPlayPause() {
  return animationPanel.toggleAnimPlayPause();
}

export function handleAnimImportSubmit() {
  return animationPanel.handleAnimImportSubmit();
}

export function showTimelineForGroup(group) {
  return animationPanel.showTimelineForGroup(group);
}

export function startAnimationTimelineLoop() {
  return animationPanel.startAnimationTimelineLoop();
}

export function enterAnimationMode() {
  return animationPanel.enterAnimationMode();
}

export function exitAnimationMode() {
  return animationPanel.exitAnimationMode();
}

export function refreshAnimationList() {
  return animationPanel.refreshAnimationList();
}

export function animModePlayClip(index) {
  return animationPanel.animModePlayClip(index);
}

export function animModeDeleteClip(index) {
  return animationPanel.animModeDeleteClip(index);
}

export function animModeImportAnim() {
  return animationPanel.animModeImportAnim();
}
