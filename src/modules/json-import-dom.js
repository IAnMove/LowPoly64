const IMPORT_MODAL_ID = 'import-modal';
const IMPORT_TEXTAREA_ID = 'import-json-textarea';
const IMPORT_ERROR_ID = 'import-error';

function getElement(root, id) {
  return root?.getElementById?.(id) || null;
}

function getImportModal(root = globalThis.document) {
  return getElement(root, IMPORT_MODAL_ID);
}

function getImportTextarea(root = globalThis.document) {
  return getElement(root, IMPORT_TEXTAREA_ID);
}

function getImportError(root = globalThis.document) {
  return getElement(root, IMPORT_ERROR_ID);
}

export function showImportModal(root = globalThis.document) {
  getImportModal(root)?.classList.remove('hidden');
}

export function hideImportModal(root = globalThis.document) {
  getImportModal(root)?.classList.add('hidden');
}

export function isImportModalOpen(root = globalThis.document) {
  const modal = getImportModal(root);
  return Boolean(modal && !modal.classList.contains('hidden'));
}

export function clearImportModal(root = globalThis.document) {
  setImportText('', root);
  clearImportError(root);
}

export function getImportText(root = globalThis.document) {
  return getImportTextarea(root)?.value.trim() || '';
}

export function setImportText(text, root = globalThis.document) {
  const textarea = getImportTextarea(root);
  if (textarea) textarea.value = text;
}

export function setImportError(message, root = globalThis.document) {
  const error = getImportError(root);
  if (error) error.textContent = message;
}

export function clearImportError(root = globalThis.document) {
  setImportError('', root);
}

export function createJSONImportDomAdapter({ root = globalThis.document } = {}) {
  return {
    showImportModal: () => showImportModal(root),
    hideImportModal: () => hideImportModal(root),
    isImportModalOpen: () => isImportModalOpen(root),
    clearImportModal: () => clearImportModal(root),
    getImportText: () => getImportText(root),
    setImportText: (text) => setImportText(text, root),
    setImportError: (message) => setImportError(message, root),
    clearImportError: () => clearImportError(root),
  };
}
