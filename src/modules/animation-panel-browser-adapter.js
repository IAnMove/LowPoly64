import { state } from './state.js';
import { centerCameraOnSelected } from './actions.js';
import { selectMesh } from './selection.js';
import { showToast } from './ui.js';
import {
  getAnimationProgress,
  playAnimation,
  stopAnimation,
} from './animation.js';
import { createAnimationTimelineDomAdapter } from './animation-timeline-dom.js';
import { createAnimationListDomAdapter } from './animation-list-dom.js';
import { createAnimationImportDomAdapter } from './animation-import-dom.js';
import { createAnimationModeDomAdapter } from './animation-mode-dom.js';
import { playAnimationClipAt } from './animation-playback-flow.js';
import {
  canEnterAnimationMode,
  deleteAnimationAt,
  enterAnimationModeState,
  exitAnimationModeState,
  hasAnimationClipAt,
  hasAnimationClips,
} from './animation-mode-state.js';
import { createAnimationPanelFacadeController } from './animation-panel-controller.js';
import { createAnimationPanelTargets } from './animation-panel-targets.js';
import { importAnimationToGroup } from './animation-import.js';
import { t } from './i18n.js';

export function createBrowserAnimationPanel({
  getAnimationState = () => state,
  createFacadeController = createAnimationPanelFacadeController,
  root = globalThis.document,
  createTimelineDom = createAnimationTimelineDomAdapter,
  createListDom = createAnimationListDomAdapter,
  createImportDom = createAnimationImportDomAdapter,
  createModeDom = createAnimationModeDomAdapter,
  createPanelTargets = createAnimationPanelTargets,
} = {}) {
  const timelineDom = createTimelineDom({ root });
  const listDom = createListDom({ root });
  const importDom = createImportDom({ root });
  const modeDom = createModeDom({ root });

  return createFacadeController({
    getAnimationState,
    translate: t,
    getAnimationProgress,
    playAnimation,
    stopAnimation,
    importAnimationToGroup,
    renderAnimationTimeline: timelineDom.renderAnimationTimeline,
    updateAnimationTimelinePlayback: timelineDom.updateAnimationTimelinePlayback,
    renderAnimationModeList: listDom.renderAnimationModeList,
    getModalAnimationImportText: importDom.getModalAnimationImportText,
    clearModalAnimationImportText: importDom.clearModalAnimationImportText,
    setModalAnimationImportError: importDom.setModalAnimationImportError,
    getModeAnimationImportText: importDom.getModeAnimationImportText,
    clearModeAnimationImportText: importDom.clearModeAnimationImportText,
    setModeAnimationImportError: importDom.setModeAnimationImportError,
    hideAnimationModeChrome: modeDom.hideAnimationModeChrome,
    showAnimationModeChrome: modeDom.showAnimationModeChrome,
    selectMesh,
    centerCameraOnSelected,
    showToast,
    setSelectedAnimationIndex: timelineDom.setSelectedAnimationIndex,
    canEnterAnimationMode,
    enterAnimationModeState,
    exitAnimationModeState,
    hasAnimationClipAt,
    hasAnimationClips,
    deleteAnimationAt,
    playAnimationClipAtCommand: playAnimationClipAt,
    createPanelTargets: (animationState) => createPanelTargets(animationState, {
      readSelectedAnimationIndex: timelineDom.getSelectedAnimationIndex,
    }),
  });
}
