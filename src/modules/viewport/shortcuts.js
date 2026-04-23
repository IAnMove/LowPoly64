import { state } from '../shared/state.js';
import { cloneObjectForDuplication, deleteSelected, duplicateSelected, groupSelected, insertDuplicatedObjects, ungroupSelected } from './actions.js';
import { undo, redo } from '../shared/undo.js';
import { refreshObjectList, updateSelectedOverlay } from './object-list.js';
import { updateExportButtonText } from './ui.js';
import { emit } from '../../event-bus.js';

const clipboardState = {
  entries: [],
  pasteCount: 0,
};

function isInputFocused() {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select';
}

function scheduleShortcutUiRefresh() {
  setTimeout(() => {
    updateExportButtonText();
    updateSelectedOverlay();
    refreshObjectList();
    emit('scene:objects-changed');
  }, 0);
}

function isAncestorInSelection(object, selectionSet) {
  let current = object?.parent || null;
  while (current) {
    if (selectionSet.has(current)) return true;
    if (current === state.userObjects) break;
    current = current.parent;
  }
  return false;
}

function getClipboardSelectionEntries() {
  if (state.selectedMeshes.size > 0) {
    const selection = Array.from(state.selectedMeshes);
    const selectionSet = new Set(selection);
    return selection
      .filter((object) => !isAncestorInSelection(object, selectionSet))
      .map((object) => ({
        source: object,
        parent: object.parent || state.userObjects,
      }));
  }

  if (state.selectedMesh) {
    return [{
      source: state.selectedMesh,
      parent: state.selectedMesh.parent || state.userObjects,
    }];
  }

  return [];
}

function copySelectedObjectToClipboard() {
  if (state.animationMode) return false;
  const selectionEntries = getClipboardSelectionEntries();
  if (selectionEntries.length === 0) return false;

  clipboardState.entries = selectionEntries
    .map(({ source, parent }) => ({
      source: cloneObjectForDuplication(source),
      parent,
    }))
    .filter((entry) => entry.source);
  clipboardState.pasteCount = 0;
  return clipboardState.entries.length > 0;
}

function pasteClipboardObject() {
  if (!clipboardState.entries.length || state.animationMode) return false;
  clipboardState.pasteCount += 1;
  const clones = insertDuplicatedObjects(clipboardState.entries, {
    offset: [clipboardState.pasteCount, 0, 0],
  });
  return clones.length > 0;
}

export function onKeyDown(event) {
  if (isInputFocused()) return;

  const key = event.key.toLowerCase();

  // Ctrl combos
  if (event.ctrlKey || event.metaKey) {
    if (key === 'z') {
      event.preventDefault();
      if (event.shiftKey) {
        redo();
      } else {
        undo();
      }
      scheduleShortcutUiRefresh();
      return;
    }
    if (key === 'd') {
      event.preventDefault();
      duplicateSelected();
      scheduleShortcutUiRefresh();
      return;
    }
    if (key === 'g') {
      event.preventDefault();
      if (event.shiftKey) {
        ungroupSelected();
      } else {
        groupSelected();
      }
      scheduleShortcutUiRefresh();
      return;
    }
    if (key === 'c') {
      if (copySelectedObjectToClipboard()) {
        event.preventDefault();
        return;
      }
    }
    if (key === 'v') {
      if (pasteClipboardObject()) {
        event.preventDefault();
        scheduleShortcutUiRefresh();
        return;
      }
    }
  }

  switch (key) {
    case 'w':
      state.transformControls.setMode('translate');
      break;
    case 'e':
      if (state.transformControls.object?.userData?.isAnimFrameProxy) {
        state.transformControls.setMode('translate');
        break;
      }
      state.transformControls.setMode('rotate');
      break;
    case 'r':
      if (state.transformControls.object?.userData?.isAnimFrameProxy) {
        state.transformControls.setMode('translate');
        break;
      }
      state.transformControls.setMode('scale');
      break;
    case 'delete':
      deleteSelected();
      scheduleShortcutUiRefresh();
      break;
    case ' ':
      event.preventDefault();
      emit('animation:play-pause');
      break;
    case 'escape':
      // Exit animation mode if active
      if (state.animationMode) {
        emit('animation:exit-mode');
        return;
      }
      // Close import modal if open
      const modal = document.getElementById('import-modal');
      if (modal && !modal.classList.contains('hidden')) {
        modal.classList.add('hidden');
      }
      break;
  }
}
