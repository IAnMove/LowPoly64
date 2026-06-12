const DEFAULT_SHORTCUT_CONTEXT = {
  getActiveElement: () => null,
  isAnimationMode: () => false,
  isImportModalOpen: () => false,
  setTransformMode: () => {},
  undo: () => {},
  redo: () => {},
  duplicateSelected: () => {},
  deleteSelected: () => {},
  groupSelected: () => {},
  ungroupSelected: () => {},
  toggleAnimPlayPause: null,
  exitAnimationMode: null,
  closeImportModal: null,
};

function createShortcutContext(overrides = {}) {
  return { ...DEFAULT_SHORTCUT_CONTEXT, ...overrides };
}

export function isEditableShortcutTarget(element) {
  if (!element) return false;
  const tag = element.tagName?.toLowerCase?.();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || element.isContentEditable === true;
}

export function createShortcutController({ initialHooks = {} } = {}) {
  let shortcutHooks = createShortcutContext(initialHooks);

  function configureShortcutHooks(hooks = {}) {
    Object.assign(shortcutHooks, hooks);
  }

  function resetShortcutHooks() {
    shortcutHooks = createShortcutContext(initialHooks);
  }

  function isInputFocused() {
    return isEditableShortcutTarget(shortcutHooks.getActiveElement?.());
  }

  function onKeyDown(event) {
    if (isInputFocused()) return;

    const key = String(event.key ?? '').toLowerCase();

    if (event.ctrlKey || event.metaKey) {
      if (key === 'z') {
        event.preventDefault();
        if (event.shiftKey) {
          shortcutHooks.redo();
        } else {
          shortcutHooks.undo();
        }
        return;
      }
      if (key === 'd') {
        event.preventDefault();
        shortcutHooks.duplicateSelected();
        return;
      }
      if (key === 'g') {
        event.preventDefault();
        if (event.shiftKey) {
          shortcutHooks.ungroupSelected();
        } else {
          shortcutHooks.groupSelected();
        }
        return;
      }
    }

    switch (key) {
      case 'w':
        shortcutHooks.setTransformMode('translate');
        break;
      case 'e':
        shortcutHooks.setTransformMode('rotate');
        break;
      case 'r':
        shortcutHooks.setTransformMode('scale');
        break;
      case 'delete':
        shortcutHooks.deleteSelected();
        break;
      case ' ':
        event.preventDefault();
        shortcutHooks.toggleAnimPlayPause?.();
        break;
      case 'escape':
        if (shortcutHooks.isAnimationMode() && shortcutHooks.exitAnimationMode) {
          shortcutHooks.exitAnimationMode();
          return;
        }
        if (shortcutHooks.isImportModalOpen() && shortcutHooks.closeImportModal) {
          shortcutHooks.closeImportModal();
        }
        break;
    }
  }

  return {
    configureShortcutHooks,
    resetShortcutHooks,
    onKeyDown,
  };
}
