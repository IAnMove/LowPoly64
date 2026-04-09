import { state } from '../shared/state.js';
import { deleteSelected, duplicateSelected, groupSelected, ungroupSelected } from './actions.js';
import { undo, redo } from '../shared/undo.js';
import { emit } from '../../event-bus.js';

function isInputFocused() {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select';
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
      return;
    }
    if (key === 'd') {
      event.preventDefault();
      duplicateSelected();
      return;
    }
    if (key === 'g') {
      event.preventDefault();
      if (event.shiftKey) {
        ungroupSelected();
      } else {
        groupSelected();
      }
      return;
    }
  }

  switch (key) {
    case 'w':
      state.transformControls.setMode('translate');
      break;
    case 'e':
      state.transformControls.setMode('rotate');
      break;
    case 'r':
      state.transformControls.setMode('scale');
      break;
    case 'delete':
      deleteSelected();
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
