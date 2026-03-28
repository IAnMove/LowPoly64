import { state } from './state.js';
import { buildGroupFromDefinition } from './templates.js';
import { selectMesh, deselect } from './selection.js';
import { showToast } from './ui.js';
import { pushAction } from './undo.js';
import { compileAnimation } from './animation.js';

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

  const firstMesh = group.children.find((c) => c.isMesh);
  if (firstMesh) selectMesh(firstMesh);

  pushAction({
    type: 'Importar objeto',
    undo: () => { if (state.selectedMesh === group || group.children.includes(state.selectedMesh)) deselect(); state.userObjects.remove(group); },
    redo: () => { state.userObjects.add(group); const m = group.children.find((c) => c.isMesh); if (m) selectMesh(m); },
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
  if (!text) {
    document.getElementById('import-error').textContent = 'Pega un JSON primero.';
    return;
  }

  const result = importObjectFromJSON(text);
  if (result.success) {
    closeImportModal();
  } else {
    document.getElementById('import-error').textContent = result.error;
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
