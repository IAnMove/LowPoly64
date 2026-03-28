import { state } from './state.js';
import { buildGroupFromDefinition } from './templates.js';
import { selectMesh, deselect } from './selection.js';
import { showToast } from './ui.js';
import { pushAction } from './undo.js';
import { compileAnimation } from './animation.js';
import { importAnimationToGroup } from './animation-import.js';

const VALID_TYPES = ['cube', 'sphere', 'cylinder', 'cone', 'plane', 'capsule', 'torus'];

export function validateObjectJSON(data) {
  if (!data || typeof data !== 'object') {
    return 'El JSON debe ser un objeto.';
  }
  if (!Array.isArray(data.pieces) || data.pieces.length === 0) {
    return 'El JSON debe tener un array "pieces" con al menos un elemento.';
  }
  for (let i = 0; i < data.pieces.length; i++) {
    const piece = data.pieces[i];
    if (!piece.geometry || !piece.geometry.type) {
      return `Pieza ${i + 1}: falta "geometry.type".`;
    }
    if (!VALID_TYPES.includes(piece.geometry.type)) {
      return `Pieza ${i + 1}: tipo "${piece.geometry.type}" no soportado. Usa: ${VALID_TYPES.join(', ')}`;
    }
    if (piece.pivot !== undefined) {
      if (!Array.isArray(piece.pivot) || piece.pivot.length !== 3 || piece.pivot.some((v) => typeof v !== 'number')) {
        return `Pieza ${i + 1}: "pivot" debe ser un array de 3 numeros [x, y, z].`;
      }
    }
    if (piece.parent !== undefined) {
      if (typeof piece.parent !== 'string' || piece.parent.length === 0) {
        return `Pieza ${i + 1}: "parent" debe ser un string no vacio.`;
      }
    }
  }
  return null;
}

export function importObjectFromJSON(jsonString) {
  let data;
  try {
    data = JSON.parse(jsonString);
  } catch (e) {
    return { success: false, error: 'JSON invalido: ' + e.message };
  }

  const validationError = validateObjectJSON(data);
  if (validationError) {
    return { success: false, error: validationError };
  }

  // Apply defaults
  if (!data.name) data.name = 'IMPORTED OBJECT';
  data.pieces.forEach((piece, i) => {
    if (!piece.name) piece.name = `PIECE_${i + 1}`;
    if (!piece.color) piece.color = '#ffcc00';
    if (!piece.position) piece.position = [0, 0, 0];
    if (!piece.geometry.params) piece.geometry.params = {};
  });

  const group = buildGroupFromDefinition(data);

  // Compile embedded animations if present
  if (Array.isArray(data.animations) && data.animations.length > 0) {
    group.userData.animations = [];
    group.userData.animationClips = [];
    data.animations.forEach((animDef) => {
      try {
        const clip = compileAnimation(animDef, group);
        if (clip) {
          group.userData.animations.push(animDef);
          group.userData.animationClips.push(clip);
        }
      } catch (e) {
        console.warn('Skipping invalid animation:', e);
      }
    });
    if (group.userData.animationClips.length > 0) {
      showToast(`${group.userData.animationClips.length} animacion(es) importada(s)`);
    }
  }

  state.userObjects.add(group);

  // Select the group itself so timeline and animation mode are accessible
  selectMesh(group);

  pushAction({
    type: 'Importar objeto',
    undo: () => { if (state.selectedMesh === group || group.children.includes(state.selectedMesh)) deselect(); state.userObjects.remove(group); },
    redo: () => { state.userObjects.add(group); selectMesh(group); },
  });

  showToast('Objeto importado: ' + data.name);
  return { success: true };
}

export function openImportModal() {
  document.getElementById('import-modal').classList.remove('hidden');
  document.getElementById('import-json-textarea').value = '';
  document.getElementById('import-error').textContent = '';
}

export function closeImportModal() {
  document.getElementById('import-modal').classList.add('hidden');
}

export function handleImportSubmit() {
  const text = document.getElementById('import-json-textarea').value.trim();
  const errorEl = document.getElementById('import-error');
  if (!text) {
    errorEl.textContent = 'Pega un JSON primero.';
    return;
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    errorEl.textContent = 'JSON invalido: ' + e.message;
    return;
  }

  // Auto-detect: object with pieces, animation with tracks, or batch animations
  if (data.pieces) {
    // Object (possibly with embedded animations)
    const result = importObjectFromJSON(text);
    if (result.success) {
      closeImportModal();
    } else {
      errorEl.textContent = result.error;
    }
  } else if (data.tracks) {
    // Single animation — apply to selected group
    importAnimToSelected(text, errorEl);
  } else if (data.animations && !data.pieces) {
    // Batch animations — apply to selected group
    importAnimToSelected(text, errorEl);
  } else {
    errorEl.textContent = 'JSON no reconocido. Debe tener "pieces" (objeto) o "tracks"/"animations" (animacion).';
  }
}

function importAnimToSelected(jsonText, errorEl) {
  const group = state.selectedMesh;
  if (!group || !group.isGroup) {
    errorEl.textContent = 'Para importar animaciones, selecciona un grupo primero.';
    return;
  }
  const result = importAnimationToGroup(jsonText, group);
  if (result.success) {
    if (typeof window.showTimelineForGroup === 'function') {
      window.showTimelineForGroup(group);
    }
    closeImportModal();
  } else {
    errorEl.textContent = result.error;
  }
}

export function handleImportFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    document.getElementById('import-json-textarea').value = e.target.result;
    handleImportSubmit();
  };
  reader.readAsText(file);
}
