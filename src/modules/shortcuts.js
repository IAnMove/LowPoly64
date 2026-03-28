import { state } from './state.js';
import { deleteSelected, duplicateSelected, groupSelected, ungroupSelected } from './actions.js';

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
    case 'escape':
      // Close import modal if open
      const modal = document.getElementById('import-modal');
      if (modal && !modal.classList.contains('hidden')) {
        modal.classList.add('hidden');
      }
      break;
  }
}
