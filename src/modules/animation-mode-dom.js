function getElement(root, id) {
  return root?.getElementById?.(id) || null;
}

function addHidden(root, id) {
  getElement(root, id)?.classList.add('hidden');
}

function removeHidden(root, id) {
  getElement(root, id)?.classList.remove('hidden');
}

function setText(root, id, text) {
  const element = getElement(root, id);
  if (element) element.textContent = text;
}

export function showAnimationModeChrome(objectName, root = globalThis.document) {
  addHidden(root, 'left-panel');
  addHidden(root, 'properties-panel');
  removeHidden(root, 'anim-mode-panel');
  removeHidden(root, 'anim-mode-banner');
  setText(root, 'anim-mode-obj-name', objectName);
  setText(root, 'anim-mode-banner-name', objectName);
}

export function hideAnimationModeChrome(hasSelection, root = globalThis.document) {
  removeHidden(root, 'left-panel');
  addHidden(root, 'anim-mode-panel');
  addHidden(root, 'anim-mode-banner');
  if (hasSelection) {
    removeHidden(root, 'properties-panel');
  }
}

export function createAnimationModeDomAdapter({ root = globalThis.document } = {}) {
  return {
    hideAnimationModeChrome: (hasSelection) => hideAnimationModeChrome(hasSelection, root),
    showAnimationModeChrome: (objectName) => showAnimationModeChrome(objectName, root),
  };
}
