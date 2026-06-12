function getElement(root, id) {
  return root?.getElementById?.(id) || null;
}

export function showSingleSelectionHeader(name, root = globalThis.document) {
  getElement(root, 'scene-info-view')?.classList.add('hidden');
  getElement(root, 'properties-panel')?.classList.remove('hidden');
  const selectedName = getElement(root, 'selected-name');
  if (selectedName) selectedName.textContent = name || 'Mesh';
}

export function showMultiSelectionHeader(label, root = globalThis.document) {
  getElement(root, 'properties-panel')?.classList.remove('hidden');
  const selectedName = getElement(root, 'selected-name');
  if (selectedName) selectedName.textContent = label;
}

export function hideAnimationTimeline(root = globalThis.document) {
  getElement(root, 'animation-timeline')?.classList.add('hidden');
}

export function createSelectionDomAdapter({ root = globalThis.document } = {}) {
  return {
    hideAnimationTimeline: () => hideAnimationTimeline(root),
    showMultiSelectionHeader: (label) => showMultiSelectionHeader(label, root),
    showSingleSelectionHeader: (name) => showSingleSelectionHeader(name, root),
  };
}
