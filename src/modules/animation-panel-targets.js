import { getAnimationGroup } from './animation-mode-state.js';
import { getSelectedAnimationIndex } from './animation-timeline-dom.js';

export function getPanelAnimationGroup(animationState, resolveAnimationGroup = getAnimationGroup) {
  return resolveAnimationGroup(animationState);
}

export function getPanelSelectedAnimationIndex(readSelectedAnimationIndex = getSelectedAnimationIndex) {
  return readSelectedAnimationIndex();
}

export function getModalAnimationImportTarget(animationState) {
  return animationState.selectedMesh;
}

export function getModeAnimationImportTarget(animationState) {
  return animationState.animationModeObject;
}

export function createAnimationPanelTargets(animationState, {
  resolveAnimationGroup = getPanelAnimationGroup,
  readSelectedAnimationIndex = getPanelSelectedAnimationIndex,
  resolveModalImportTarget = getModalAnimationImportTarget,
  resolveModeImportTarget = getModeAnimationImportTarget,
} = {}) {
  return {
    getAnimationGroup: () => resolveAnimationGroup(animationState),
    getSelectedAnimationIndex: () => readSelectedAnimationIndex(),
    getModalImportTarget: () => resolveModalImportTarget(animationState),
    getModeImportTarget: () => resolveModeImportTarget(animationState),
  };
}
