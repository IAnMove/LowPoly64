export function updateSnapIndicator(enabled, translate, root = globalThis.document) {
  const indicator = root?.getElementById?.('snap-status');
  if (indicator) {
    indicator.textContent = enabled ? translate('snapOn') : translate('snapOff');
    return true;
  }

  return false;
}

export function createSnapDomAdapter({ root = globalThis.document } = {}) {
  return {
    updateSnapIndicator: (enabled, translate) => updateSnapIndicator(enabled, translate, root),
  };
}
