// Assign Rig Modal UI
import { state } from '../shared/state.js';
import { t } from '../shared/i18n.js';
import { ARCHETYPE_IDS } from './archetype-system.js';
import { getSkeletonsByArchetype, getSkeletonById } from './skeleton-registry.js';
import { openRigPanel } from './rig-ui.js';

let _assignRigTarget = null;

export function openAssignRigModal(group) {
  const g = group || state.selectedMesh;
  if (!g || !g.isGroup) return;
  _assignRigTarget = g;

  const archSelect = document.getElementById('assign-rig-archetype');
  archSelect.innerHTML = '';
  ARCHETYPE_IDS.forEach((id) => {
    const opt = document.createElement('option');
    opt.value = id;
    opt.textContent = id;
    archSelect.appendChild(opt);
  });

  onAssignRigArchetypeChange();
  document.getElementById('assign-rig-modal').classList.remove('hidden');
}

export function onAssignRigArchetypeChange() {
  const archetypeId = document.getElementById('assign-rig-archetype')?.value;
  const skelSelect = document.getElementById('assign-rig-skeleton');
  if (!skelSelect) return;
  skelSelect.innerHTML = '';
  getSkeletonsByArchetype(archetypeId).forEach((s) => {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = s.id;
    skelSelect.appendChild(opt);
  });
  if (skelSelect.options.length === 0) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = '(ninguno)';
    skelSelect.appendChild(opt);
  }
}

export function confirmAssignRig() {
  const g = _assignRigTarget;
  if (!g) return;

  const archetypeId = document.getElementById('assign-rig-archetype')?.value;
  const skeletonId = document.getElementById('assign-rig-skeleton')?.value;
  if (!archetypeId) return;

  const skeleton = skeletonId ? getSkeletonById(skeletonId) : null;

  g.userData.archetype = archetypeId;
  g.userData.skeletonId = skeletonId || null;
  g.userData.slotBindings = skeleton ? { ...skeleton.defaultBindings } : {};
  if (!g.userData.slotMap) g.userData.slotMap = {};

  document.getElementById('assign-rig-modal').classList.add('hidden');
  _assignRigTarget = null;

  const rigBtn = document.getElementById('btn-rig-panel');
  if (rigBtn) {
    rigBtn.textContent = t('rigAnimations');
  }

  openRigPanel(g);
}
