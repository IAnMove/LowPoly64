import { createAnimationPanelTargets } from './animation-panel-targets.js';
import { createAnimationPanelController as createAnimationPanelRuntimeController } from './animation-panel-runtime-flow.js';

export function createAnimationPanelFacadeController({
  getAnimationState = () => ({}),
  translate,
  getAnimationProgress,
  playAnimation,
  stopAnimation,
  importAnimationToGroup,
  renderAnimationTimeline,
  updateAnimationTimelinePlayback,
  renderAnimationModeList,
  getModalAnimationImportText,
  clearModalAnimationImportText,
  setModalAnimationImportError,
  getModeAnimationImportText,
  clearModeAnimationImportText,
  setModeAnimationImportError,
  hideAnimationModeChrome,
  showAnimationModeChrome,
  selectMesh,
  centerCameraOnSelected,
  showToast,
  setSelectedAnimationIndex,
  canEnterAnimationMode,
  enterAnimationModeState,
  exitAnimationModeState,
  hasAnimationClipAt,
  hasAnimationClips,
  deleteAnimationAt,
  playAnimationClipAtCommand,
  createPanelTargets = createAnimationPanelTargets,
  createRuntimeController = createAnimationPanelRuntimeController,
} = {}) {
  const animationState = getAnimationState();
  const panelTargets = createPanelTargets(animationState);
  const animationPanelRuntime = createRuntimeController({
    animationState,
    panelTargets,
    translate,
    getAnimationProgress,
    playAnimation,
    stopAnimation,
    importAnimationToGroup,
    renderAnimationTimeline,
    updateAnimationTimelinePlayback,
    renderAnimationModeList,
    getModalAnimationImportText,
    clearModalAnimationImportText,
    setModalAnimationImportError,
    getModeAnimationImportText,
    clearModeAnimationImportText,
    setModeAnimationImportError,
    hideAnimationModeChrome,
    showAnimationModeChrome,
    selectMesh,
    centerCameraOnSelected,
    showToast,
    setSelectedAnimationIndex,
    canEnterAnimationMode,
    enterAnimationModeState,
    exitAnimationModeState,
    hasAnimationClipAt,
    hasAnimationClips,
    deleteAnimationAt,
    playAnimationClipAtCommand,
  });

  function playAnim() {
    return animationPanelRuntime.playAnim();
  }

  function stopAnim() {
    return animationPanelRuntime.stopAnim();
  }

  function onAnimSelectChange() {
    return animationPanelRuntime.onAnimSelectChange();
  }

  function toggleAnimPlayPause() {
    return animationPanelRuntime.toggleAnimPlayPause();
  }

  function handleAnimImportSubmit() {
    return animationPanelRuntime.handleAnimImportSubmit();
  }

  function showTimelineForGroup(group) {
    return animationPanelRuntime.showTimelineForGroup(group);
  }

  function startAnimationTimelineLoop() {
    return animationPanelRuntime.startAnimationTimelineLoop();
  }

  function enterAnimationMode() {
    return animationPanelRuntime.enterAnimationMode();
  }

  function exitAnimationMode() {
    return animationPanelRuntime.exitAnimationMode();
  }

  function refreshAnimationList() {
    return animationPanelRuntime.refreshAnimationList();
  }

  function animModePlayClip(index) {
    return animationPanelRuntime.animModePlayClip(index);
  }

  function animModeDeleteClip(index) {
    return animationPanelRuntime.animModeDeleteClip(index);
  }

  function animModeImportAnim() {
    return animationPanelRuntime.animModeImportAnim();
  }

  return {
    playAnim,
    stopAnim,
    onAnimSelectChange,
    toggleAnimPlayPause,
    handleAnimImportSubmit,
    showTimelineForGroup,
    startAnimationTimelineLoop,
    enterAnimationMode,
    exitAnimationMode,
    refreshAnimationList,
    animModePlayClip,
    animModeDeleteClip,
    animModeImportAnim,
  };
}
