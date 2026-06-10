import * as THREE from 'three';
import { state } from '../shared/state.js';
import { stopAnimation, compileAnimation } from './animation.js';
import {
  FAST_POSER_OUTPUT_JOINTS,
  buildFastPoserPoseEntryFromGroup,
  getFastPoserPoseQuaternion,
  hasFastPoserPoseOutputJoint,
  isFastPoserPoseLibrary,
  resolveFastPoserTargetsForGroup,
} from './animateur-animation-import.js';
import {
  buildPoseLibraryAsset,
  generatePoseLibraryId,
  normalizePoseLibraryEntry,
} from './anim-mode-pose-library.js';
import {
  ensureAnimModeRestPoseSnapshot,
  restoreGroupLocalPoseSnapshot,
} from './anim-mode-node-utils.js';
import { upsertVectorTrackKeyframe } from './anim-mode-timeline-utils.js';

const ANIM_MODE_POSE_LIBRARY_STORAGE_KEY = 'lowpoly64-fast-poser-pose-library-v1';

const poseLibraryState = {
  loaded: false,
  poses: [],
  selectedPoseId: '',
};

function getPoseLibraryDom() {
  return {
    nameInput: document.getElementById('anim-mode-pose-name'),
    select: document.getElementById('anim-mode-pose-select'),
    status: document.getElementById('anim-mode-pose-status'),
    importInput: document.getElementById('anim-mode-pose-import'),
  };
}

function setPoseLibraryStatus(message, mode = 'idle') {
  const { status } = getPoseLibraryDom();
  if (!status) return;
  status.textContent = message;
  status.className = mode === 'error'
    ? 'text-rose-300 text-[9px] leading-relaxed min-h-[1em]'
    : mode === 'success'
      ? 'text-[#ffcc00] text-[9px] leading-relaxed min-h-[1em]'
      : 'text-zinc-500 text-[9px] leading-relaxed min-h-[1em]';
}

function downloadJsonFile(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function findAnimationTargetNode(group, targetName) {
  if (!group || !targetName) return null;
  let node = null;
  group.traverse((child) => {
    if (node) return;
    const name = String(child?.userData?.name || child?.name || '').trim();
    if (name === targetName) {
      node = child;
    }
  });
  return node;
}

function applyPoseLibraryEntryToGroup(group, poseEntry) {
  if (!group?.isGroup || !poseEntry?.pose) return false;

  restoreGroupLocalPoseSnapshot(group);
  const resolvedTargets = resolveFastPoserTargetsForGroup(group);

  FAST_POSER_OUTPUT_JOINTS.forEach((outputJointName) => {
    if (!hasFastPoserPoseOutputJoint(poseEntry.pose, outputJointName)) return;
    const targetName = resolvedTargets[outputJointName];
    const quaternion = getFastPoserPoseQuaternion(poseEntry.pose, outputJointName);
    const targetNode = targetName ? findAnimationTargetNode(group, targetName) : null;
    if (!targetNode || !quaternion) return;
    targetNode.quaternion.copy(quaternion);
  });

  group.updateWorldMatrix(true, true);
  return true;
}

export function ensurePoseLibraryLoaded() {
  if (poseLibraryState.loaded) return;

  let poses = [];
  try {
    const raw = localStorage.getItem(ANIM_MODE_POSE_LIBRARY_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (isFastPoserPoseLibrary(parsed)) {
        poses = parsed.poses
          .map((entry, index) => normalizePoseLibraryEntry(entry, index))
          .filter(Boolean);
      }
    }
  } catch (error) {
    console.warn('Could not load Fast Poser pose library from localStorage.', error);
  }

  poseLibraryState.loaded = true;
  poseLibraryState.poses = poses;
  poseLibraryState.selectedPoseId = poses[0]?.id || '';
}

function persistPoseLibrary() {
  ensurePoseLibraryLoaded();
  try {
    localStorage.setItem(ANIM_MODE_POSE_LIBRARY_STORAGE_KEY, JSON.stringify(buildPoseLibraryAsset()));
  } catch (error) {
    console.warn('Could not persist Fast Poser pose library.', error);
  }
}

function getSelectedPoseLibraryEntry() {
  ensurePoseLibraryLoaded();
  const selected = poseLibraryState.poses.find((entry) => entry.id === poseLibraryState.selectedPoseId) || poseLibraryState.poses[0] || null;
  if (selected) {
    poseLibraryState.selectedPoseId = selected.id;
  } else {
    poseLibraryState.selectedPoseId = '';
  }
  return selected;
}

export function refreshPoseLibraryUi() {
  ensurePoseLibraryLoaded();
  const { nameInput, select } = getPoseLibraryDom();
  if (!select) return;

  const selectedEntry = getSelectedPoseLibraryEntry();
  select.innerHTML = '';
  if (poseLibraryState.poses.length === 0) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'NO SAVED POSES';
    select.appendChild(option);
    select.disabled = true;
  } else {
    poseLibraryState.poses.forEach((entry) => {
      const option = document.createElement('option');
      option.value = entry.id;
      option.textContent = entry.name;
      select.appendChild(option);
    });
    select.disabled = false;
    select.value = selectedEntry?.id || poseLibraryState.poses[0].id;
  }

  if (nameInput && selectedEntry && !nameInput.value.trim()) {
    nameInput.value = selectedEntry.name;
  }
}

export function selectPose() {
  ensurePoseLibraryLoaded();
  const { nameInput, select } = getPoseLibraryDom();
  poseLibraryState.selectedPoseId = String(select?.value || '');
  const selected = getSelectedPoseLibraryEntry();
  if (nameInput && selected) {
    nameInput.value = selected.name;
  }
  setPoseLibraryStatus(selected ? `Selected pose "${selected.name}".` : 'No pose selected.');
}

export function savePoseToLibrary() {
  ensurePoseLibraryLoaded();
  const object = state.animationModeObject;
  const { nameInput } = getPoseLibraryDom();
  if (!object?.isGroup) {
    setPoseLibraryStatus('Open animation mode on a group before saving poses.', 'error');
    return;
  }

  const poseName = String(nameInput?.value || '').trim() || `${object.userData?.name || object.name || 'Group'} Pose`;
  const captured = buildFastPoserPoseEntryFromGroup(object, { name: poseName });
  if (!captured.success) {
    setPoseLibraryStatus(captured.error || 'Could not capture the current pose.', 'error');
    return;
  }

  const existingIndex = poseLibraryState.poses.findIndex((entry) => entry.id === poseLibraryState.selectedPoseId && entry.name === poseName);
  const nextEntry = normalizePoseLibraryEntry({
    ...captured.data,
    id: existingIndex >= 0 ? poseLibraryState.poses[existingIndex].id : generatePoseLibraryId(),
    createdAt: existingIndex >= 0 ? poseLibraryState.poses[existingIndex].createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }, poseLibraryState.poses.length);

  if (existingIndex >= 0) {
    poseLibraryState.poses.splice(existingIndex, 1, nextEntry);
  } else {
    poseLibraryState.poses.unshift(nextEntry);
  }

  poseLibraryState.selectedPoseId = nextEntry.id;
  persistPoseLibrary();
  refreshPoseLibraryUi();
  if (nameInput) {
    nameInput.value = nextEntry.name;
  }
  setPoseLibraryStatus(`Saved pose "${nextEntry.name}" to the Fast Poser library.`, 'success');
}

export function previewPose({ refreshRigPreview }) {
  const object = state.animationModeObject;
  const poseEntry = getSelectedPoseLibraryEntry();
  if (!object?.isGroup || !poseEntry) {
    setPoseLibraryStatus('Save or import a pose first.', 'error');
    return;
  }

  if (!applyPoseLibraryEntryToGroup(object, poseEntry)) {
    setPoseLibraryStatus('Could not preview the selected pose on this character.', 'error');
    return;
  }

  stopAnimation();
  refreshRigPreview(object);
  setPoseLibraryStatus(`Previewing pose "${poseEntry.name}".`, 'success');
}

export function applyPoseToFrame({
  getCurrentAnimationEditorContext,
  getKeyframeIndex,
  applyAnimationDefinitionAtTime,
  refreshRigPreview,
  refreshAnimationList,
  showTimelineForGroup,
  refreshAnimModeEditor,
}) {
  const poseEntry = getSelectedPoseLibraryEntry();
  const context = getCurrentAnimationEditorContext();
  const { object, animationIndex, animationDef, selectedTime } = context;

  if (!object?.isGroup || !animationDef || !poseEntry) {
    setPoseLibraryStatus('Select a clip frame and a saved pose first.', 'error');
    return;
  }

  const restSnapshot = ensureAnimModeRestPoseSnapshot(object);
  const resolvedTargets = resolveFastPoserTargetsForGroup(object);

  FAST_POSER_OUTPUT_JOINTS.forEach((outputJointName) => {
    if (!hasFastPoserPoseOutputJoint(poseEntry.pose, outputJointName)) return;

    const targetName = resolvedTargets[outputJointName];
    const restTransform = targetName ? restSnapshot.get(targetName) : null;
    const absoluteQuaternion = getFastPoserPoseQuaternion(poseEntry.pose, outputJointName);
    if (!targetName || !restTransform?.quaternion || !absoluteQuaternion) return;

    const deltaQuaternion = restTransform.quaternion.clone().invert().multiply(absoluteQuaternion).normalize();
    const euler = new THREE.Euler().setFromQuaternion(deltaQuaternion, 'XYZ');
    upsertVectorTrackKeyframe(
      animationDef,
      targetName,
      'rotation',
      selectedTime,
      [euler.x, euler.y, euler.z],
      [0, 0, 0]
    );
  });

  const clip = compileAnimation(animationDef, object);
  if (!clip) {
    setPoseLibraryStatus('Could not rebuild the clip after applying the pose.', 'error');
    return;
  }

  if (!object.userData.animationClips) {
    object.userData.animationClips = [];
  }
  object.userData.animationClips[animationIndex] = clip;
  stopAnimation();
  applyAnimationDefinitionAtTime(object, animationDef, selectedTime);
  refreshRigPreview(object);
  refreshAnimationList();
  showTimelineForGroup(object);
  refreshAnimModeEditor({ previewFrame: false });
  setPoseLibraryStatus(`Applied pose "${poseEntry.name}" to frame ${getKeyframeIndex() + 1}.`, 'success');
}

export function deletePose() {
  ensurePoseLibraryLoaded();
  const poseEntry = getSelectedPoseLibraryEntry();
  if (!poseEntry) {
    setPoseLibraryStatus('No pose selected.', 'error');
    return;
  }

  poseLibraryState.poses = poseLibraryState.poses.filter((entry) => entry.id !== poseEntry.id);
  poseLibraryState.selectedPoseId = poseLibraryState.poses[0]?.id || '';
  persistPoseLibrary();
  refreshPoseLibraryUi();
  setPoseLibraryStatus(`Deleted pose "${poseEntry.name}".`);
}

export function exportPoseLibrary() {
  ensurePoseLibraryLoaded();
  if (poseLibraryState.poses.length === 0) {
    setPoseLibraryStatus('Save or import at least one pose before exporting.', 'error');
    return;
  }

  downloadJsonFile(buildPoseLibraryAsset(), 'fast-poser.pose-library.json');
  setPoseLibraryStatus('Fast Poser pose library exported.', 'success');
}

export async function importPoseLibrary(event) {
  ensurePoseLibraryLoaded();
  const { importInput } = getPoseLibraryDom();
  const file = event?.target?.files?.[0] || importInput?.files?.[0] || null;
  if (!file) {
    setPoseLibraryStatus('Choose a pose library JSON file first.', 'error');
    return;
  }

  try {
    const parsed = JSON.parse(await file.text());
    if (!isFastPoserPoseLibrary(parsed)) {
      setPoseLibraryStatus('This file is not a Fast Poser pose library.', 'error');
      return;
    }

    const imported = parsed.poses
      .map((entry, index) => normalizePoseLibraryEntry({
        ...entry,
        id: generatePoseLibraryId(),
      }, index))
      .filter(Boolean);

    if (imported.length === 0) {
      setPoseLibraryStatus('The imported pose library has no valid poses.', 'error');
      return;
    }

    poseLibraryState.poses = [...imported, ...poseLibraryState.poses];
    poseLibraryState.selectedPoseId = imported[0].id;
    persistPoseLibrary();
    refreshPoseLibraryUi();
    setPoseLibraryStatus(`Imported ${imported.length} pose${imported.length === 1 ? '' : 's'} from Fast Poser.`, 'success');
  } catch (error) {
    console.error(error);
    setPoseLibraryStatus('Could not import the pose library JSON.', 'error');
  } finally {
    if (importInput) {
      importInput.value = '';
    }
  }
}
