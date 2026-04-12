// Assign Rig Modal UI
import { state } from '../shared/state.js';
import { t } from '../shared/i18n.js';
import { ARCHETYPE_IDS } from './archetype-system.js';
import { getSkeletonsByArchetype, getSkeletonById } from './skeleton-registry.js';
import { openRigPanel } from './rig-ui.js';
import { autoAssignSlotsToGroup, rebuildRigAnimationsForGroup } from './rigging-utils.js';

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

  if (g.userData?.archetype && ARCHETYPE_IDS.includes(g.userData.archetype)) {
    archSelect.value = g.userData.archetype;
  }

  onAssignRigArchetypeChange();

  const skelSelect = document.getElementById('assign-rig-skeleton');
  if (skelSelect && g.userData?.skeletonId) {
    skelSelect.value = g.userData.skeletonId;
  }

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
  const previousArchetype = g.userData?.archetype || null;
  const previousSkeletonId = g.userData?.skeletonId || null;
  const previousSlotMap = g.userData?.slotMap || {};
  const previousSlotBindings = g.userData?.slotBindings || {};
  const hasAssignedPieces = Object.values(previousSlotMap).some((pieces) => Array.isArray(pieces) && pieces.length > 0);
  const hasAssignedBindings = Object.values(previousSlotBindings).some((bones) => Array.isArray(bones) && bones.length > 0);

  g.userData.archetype = archetypeId;
  g.userData.skeletonId = skeletonId || null;
  g.userData.slotBindings = skeleton
    ? (previousSkeletonId === skeleton.id && hasAssignedBindings
      ? { ...previousSlotBindings }
      : { ...skeleton.defaultBindings })
    : {};
  if (previousArchetype !== archetypeId || !hasAssignedPieces) {
    g.userData.slotMap = autoAssignSlotsToGroup(g, archetypeId);
  } else if (!g.userData.slotMap) {
    g.userData.slotMap = {};
  }
  rebuildRigAnimationsForGroup(g, {
    skeletonId: skeleton?.id || null,
  });

  document.getElementById('assign-rig-modal').classList.add('hidden');
  _assignRigTarget = null;

  const rigBtn = document.getElementById('btn-rig-panel');
  if (rigBtn) {
    rigBtn.textContent = t('rigAnimations');
  }

  openRigPanel(g);
}
