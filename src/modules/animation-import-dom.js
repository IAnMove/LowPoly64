const IMPORT_FORM = {
  textareaId: 'import-anim-textarea',
  errorId: 'import-anim-error',
};

const MODE_IMPORT_FORM = {
  textareaId: 'anim-mode-textarea',
  errorId: 'anim-mode-import-error',
};

function getElement(root, id) {
  return root?.getElementById?.(id) || null;
}

function getFormElements(form, root) {
  return {
    textarea: getElement(root, form.textareaId),
    error: getElement(root, form.errorId),
  };
}

function getImportText(form, root = globalThis.document) {
  return getFormElements(form, root).textarea?.value?.trim() || '';
}

function clearImportText(form, root = globalThis.document) {
  const textarea = getFormElements(form, root).textarea;
  if (textarea) textarea.value = '';
}

function setImportError(form, message, root = globalThis.document) {
  const error = getFormElements(form, root).error;
  if (error) error.textContent = message;
}

export function getModalAnimationImportText(root = globalThis.document) {
  return getImportText(IMPORT_FORM, root);
}

export function clearModalAnimationImportText(root = globalThis.document) {
  clearImportText(IMPORT_FORM, root);
}

export function setModalAnimationImportError(message, root = globalThis.document) {
  setImportError(IMPORT_FORM, message, root);
}

export function getModeAnimationImportText(root = globalThis.document) {
  return getImportText(MODE_IMPORT_FORM, root);
}

export function clearModeAnimationImportText(root = globalThis.document) {
  clearImportText(MODE_IMPORT_FORM, root);
}

export function setModeAnimationImportError(message, root = globalThis.document) {
  setImportError(MODE_IMPORT_FORM, message, root);
}

export function createAnimationImportDomAdapter({ root = globalThis.document } = {}) {
  return {
    getModalAnimationImportText: () => getModalAnimationImportText(root),
    clearModalAnimationImportText: () => clearModalAnimationImportText(root),
    setModalAnimationImportError: (message) => setModalAnimationImportError(message, root),
    getModeAnimationImportText: () => getModeAnimationImportText(root),
    clearModeAnimationImportText: () => clearModeAnimationImportText(root),
    setModeAnimationImportError: (message) => setModeAnimationImportError(message, root),
  };
}
