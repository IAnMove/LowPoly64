import { runAnimationImportSubmit } from './animation-import-flow.js';
import {
  playAnimationClipAt,
  playSelectedAnimation,
  restartAnimationIfPlaying,
  toggleAnimationPlayback,
} from './animation-playback-flow.js';
import {
  playAnimationModeClip,
  refreshAnimationModeListForGroup,
  renderTimelineForGroup,
} from './animation-panel-flow.js';
import {
  runDeleteAnimationClip,
  runEnterAnimationMode,
  runExitAnimationMode,
} from './animation-mode-flow.js';
import { createAnimationTimelineLoop } from './animation-timeline-loop.js';

export function createAnimationPanelController({
  animationState,
  panelTargets,
  translate = (key) => key,
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
  playAnimationClipAtCommand = playAnimationClipAt,
  playSelectedAnimationCommand = playSelectedAnimation,
  restartAnimationIfPlayingCommand = restartAnimationIfPlaying,
  toggleAnimationPlaybackCommand = toggleAnimationPlayback,
  renderTimelineForGroupCommand = renderTimelineForGroup,
  refreshAnimationModeListForGroupCommand = refreshAnimationModeListForGroup,
  playAnimationModeClipCommand = playAnimationModeClip,
  runAnimationImportSubmitCommand = runAnimationImportSubmit,
  runEnterAnimationModeCommand = runEnterAnimationMode,
  runExitAnimationModeCommand = runExitAnimationMode,
  runDeleteAnimationClipCommand = runDeleteAnimationClip,
  createAnimationTimelineLoopCommand = createAnimationTimelineLoop,
} = {}) {
  let timelineLoop = null;

  function getAnimGroup() {
    return panelTargets.getAnimationGroup();
  }

  function getAnimSelectIdx() {
    return panelTargets.getSelectedAnimationIndex();
  }

  function playAnim() {
    return playSelectedAnimationCommand({
      group: getAnimGroup(),
      clipIndex: getAnimSelectIdx(),
      hasAnimationClips,
      stopAnimation,
      playAnimation,
    });
  }

  function stopAnim() {
    return stopAnimation();
  }

  function onAnimSelectChange() {
    return restartAnimationIfPlayingCommand({
      isPlaying: animationState.animationPlaying,
      group: getAnimGroup(),
      clipIndex: getAnimSelectIdx(),
      hasAnimationClips,
      stopAnimation,
      playAnimation,
    });
  }

  function toggleAnimPlayPause() {
    return toggleAnimationPlaybackCommand({
      isPlaying: animationState.animationPlaying,
      group: getAnimGroup(),
      clipIndex: getAnimSelectIdx(),
      hasAnimationClips,
      stopAnimation,
      playAnimation,
    });
  }

  function handleAnimImportSubmit() {
    return runAnimationImportSubmitCommand({
      getText: getModalAnimationImportText,
      getGroup: panelTargets.getModalImportTarget,
      requireGroup: true,
      messages: {
        missingText: translate('pasteAnimJson'),
        missingTarget: translate('selectGroupFirst'),
      },
      importAnimationToGroup,
      clearText: clearModalAnimationImportText,
      setError: setModalAnimationImportError,
      showTimelineForGroup,
    });
  }

  function showTimelineForGroup(group) {
    return renderTimelineForGroupCommand(group, { renderAnimationTimeline });
  }

  function startAnimationTimelineLoop() {
    if (!timelineLoop) {
      timelineLoop = createAnimationTimelineLoopCommand({
        getAnimationProgress,
        isAnimationPlaying: () => animationState.animationPlaying,
        updateAnimationTimelinePlayback,
      });
    }
    return timelineLoop.start();
  }

  function enterAnimationMode() {
    return runEnterAnimationModeCommand({
      animationState,
      canEnterAnimationMode,
      stopAnimation,
      enterAnimationModeState,
      selectMesh,
      centerCameraOnSelected,
      showAnimationModeChrome,
      refreshAnimationList,
      showTimelineForGroup,
      showToast,
      messages: {
        selectGroupForAnimMode: translate('selectGroupForAnimMode'),
        animModeLabel: translate('animModeLabel'),
        chromeFallbackName: 'Grupo',
        toastFallbackName: 'Group',
      },
    });
  }

  function exitAnimationMode() {
    return runExitAnimationModeCommand({
      animationState,
      stopAnimation,
      exitAnimationModeState,
      hideAnimationModeChrome,
      showTimelineForGroup,
      showToast,
      backToSceneMessage: translate('backToScene'),
    });
  }

  function refreshAnimationList() {
    return refreshAnimationModeListForGroupCommand(panelTargets.getModeImportTarget(), {
      renderAnimationModeList,
      onPlay: animModePlayClip,
      onDelete: animModeDeleteClip,
      translate,
    });
  }

  function animModePlayClip(index) {
    return playAnimationModeClipCommand(panelTargets.getModeImportTarget(), index, {
      playAnimationClipAt: playAnimationClipAtCommand,
      hasAnimationClipAt,
      setSelectedAnimationIndex,
      stopAnimation,
      playAnimation,
    });
  }

  function animModeDeleteClip(index) {
    return runDeleteAnimationClipCommand({
      group: panelTargets.getModeImportTarget(),
      index,
      stopAnimation,
      deleteAnimationAt,
      refreshAnimationList,
      showTimelineForGroup,
      showToast,
      deletedMessage: translate('animDeleted'),
    });
  }

  function animModeImportAnim() {
    return runAnimationImportSubmitCommand({
      getText: getModeAnimationImportText,
      getGroup: panelTargets.getModeImportTarget,
      messages: {
        missingText: translate('pasteAnimJson'),
        missingTarget: translate('noActiveObject'),
      },
      importAnimationToGroup,
      clearText: clearModeAnimationImportText,
      setError: setModeAnimationImportError,
      refreshAnimationList,
      showTimelineForGroup,
    });
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
