export function updateExportButtonLabel(hasSelection, labels, root = globalThis.document) {
  const button = root?.getElementById?.('btn-export');
  if (!button) return false;
  button.textContent = hasSelection ? labels.selection : labels.default;
  return true;
}

export function createExportButtonDomAdapter({ root = globalThis.document } = {}) {
  return {
    updateExportButtonLabel: (hasSelection, labels) => updateExportButtonLabel(hasSelection, labels, root),
  };
}
