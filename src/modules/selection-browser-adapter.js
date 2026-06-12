import { state } from './state.js';
import {
  clearPropertiesPanel,
  showMultiSelectionPanel,
  updateExportButtonText,
  updatePropertiesPanel,
} from './ui.js';
import { raycastBones } from './scene.js';
import { t } from './i18n.js';
import { createSelectionDomAdapter } from './selection-dom.js';
import { highlightSelection, unhighlightSelection } from './selection-highlight.js';
import { createSelectionController } from './selection-controller.js';

export function createBrowserSelectionController({
  getSelectionState = () => state,
  createFacadeController = createSelectionController,
  root = globalThis.document,
  createSelectionDom = createSelectionDomAdapter,
} = {}) {
  const selectionDom = createSelectionDom({ root });

  return createFacadeController({
    getSelectionState,
    raycastBones,
    highlightSelection,
    unhighlightSelection,
    translate: t,
    hideAnimationTimeline: selectionDom.hideAnimationTimeline,
    showMultiSelectionHeader: selectionDom.showMultiSelectionHeader,
    showSingleSelectionHeader: selectionDom.showSingleSelectionHeader,
    updatePropertiesPanel,
    clearPropertiesPanel,
    showMultiSelectionPanel,
    updateExportButtonText,
  });
}
