export function showSingleSelectionFeedback(mesh, {
  showSingleSelectionHeader = () => {},
  updatePropertiesPanel = () => {},
  updateExportButtonText = () => {},
  showTimelineForGroup = () => {},
} = {}) {
  showSingleSelectionHeader(mesh?.userData?.name);
  updatePropertiesPanel();
  updateExportButtonText();
  showTimelineForGroup(mesh);
  return true;
}

export function clearSelectionFeedback({
  clearPropertiesPanel = () => {},
} = {}) {
  clearPropertiesPanel();
  return true;
}

export function clearAllSelectionFeedback({
  animationMode = false,
  clearPropertiesPanel = () => {},
  updateExportButtonText = () => {},
  hideAnimationTimeline = () => {},
} = {}) {
  clearPropertiesPanel();
  updateExportButtonText();
  if (!animationMode) {
    hideAnimationTimeline();
  }
  return true;
}

export function syncMultiSelectionFeedback(selectionState, {
  translate = (_key, params) => `${params?.n || 0}`,
  showMultiSelectionHeader = () => {},
  showMultiSelectionPanel = () => {},
  selectMesh = () => {},
} = {}) {
  const count = selectionState.selectedMeshes.size;

  if (count > 1) {
    showMultiSelectionHeader(translate('nObjects', { n: count }));
    showMultiSelectionPanel();
    return { type: 'multi', count };
  }

  if (count === 1) {
    const mesh = selectionState.selectedMeshes.values().next().value;
    selectionState.selectedMeshes.clear();
    selectMesh(mesh);
    return { type: 'single', mesh };
  }

  return { type: 'empty' };
}

export function syncMultiRemovalFeedback(result, selectionState, {
  selectMesh = () => {},
  clearPropertiesPanel = () => {},
} = {}) {
  if (result.remaining) {
    selectionState.selectedMeshes.clear();
    selectMesh(result.remaining);
    return { type: 'single', mesh: result.remaining };
  }

  if (result.size === 0) {
    clearPropertiesPanel();
    return { type: 'empty' };
  }

  return { type: 'multi', count: result.size };
}
