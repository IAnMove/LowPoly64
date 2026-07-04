import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { state } from '../shared/state.js';
import { showToast } from '../shared/ui-helpers.js';
import { t } from '../shared/i18n.js';
import { stopAnimation, playAnimation, compileAnimation } from './animation.js';
import { importAnimationToGroup } from './animation-import.js';
import {
  convertAnimationDefinitionToFastPoserAsset,
} from './animateur-animation-import.js';
import {
  buildRigPreviewHelper,
  computeSkeletonWorldPositions,
} from './anim-mode-rig-preview.js';
import {
  collectAnimationFrameTimes,
  sampleTrackValue,
  upsertVectorTrackKeyframe,
} from './anim-mode-timeline-utils.js';
import {
  buildNamedNodeLookup,
  captureGroupLocalPoseSnapshot,
  ensureAnimModeRestPoseSnapshot,
  restoreGroupLocalPoseSnapshot,
} from './anim-mode-node-utils.js';
import {
  applyAnimModeSectionState as applyAnimModeLayoutSectionState,
  ensureAnimationModeLayout as ensureAnimationModePanelLayout,
  isAnimModeSplitPreviewActive,
  restoreDefaultAnimationModeLayout,
  scheduleAnimModeLayoutResize as scheduleAnimationModeLayoutResize,
  syncAnimModeSectionStates as syncAnimModeLayoutSectionStates,
  syncAnimModeSplitClasses as syncAnimModeLayoutSplitClasses,
} from './anim-mode-layout.js';
import {
  clearReferenceVideo,
  ensureReferenceVideoBindings,
  loadReferenceVideo,
  pauseReferenceVideo,
  referenceVideoNextFrame,
  referenceVideoPrevFrame,
  setReferenceVideoSpeed,
  toggleReferenceVideoPlayback,
  updateReferenceVideoUi,
} from './anim-mode-reference-video.js';
import {
  applyPoseToFrame,
  deletePose,
  ensurePoseLibraryLoaded,
  exportPoseLibrary,
  importPoseLibrary,
  previewPose,
  refreshPoseLibraryUi,
  savePoseToLibrary,
  selectPose,
} from './anim-mode-pose-library-controller.js';
import { getSkeletonById } from './skeleton-registry.js';
import {
  buildBoneToTargetMap,
  mergeSlotBindings,
  resolveSkeletonPositionScale,
  translateAnimForMesh,
} from './mesh-animation-translation.js';
import { resolveImportEligibility } from './motion-ripper-target-config.js';
import { selectMesh } from '../viewport/selection.js';
import { centerCameraOnSelected } from '../viewport/actions.js';

const rigPreview = {
  renderer: null,
  scene: null,
  camera: null,
  controls: null,
  helperGroup: null,
  boneEntries: [],
  lineEntries: [],
  targetMap: {},
  nodeLookup: new Map(),
  skeleton: null,
  group: null,
  focusCenter: new THREE.Vector3(0, 1.8, 0),
  frameId: 0,
  selectedBoneName: '',
  selectedTargetName: '',
  raycaster: new THREE.Raycaster(),
  pointer: new THREE.Vector2(),
  dragActive: false,
  dragMoved: false,
  dragBoneName: '',
  dragTargetName: '',
  dragTargetNode: null,
  dragPlane: new THREE.Plane(),
  dragOffset: new THREE.Vector3(),
  dragPointWorld: new THREE.Vector3(),
  bindingsReady: false,
};

function cloneAnimationDef(animDef) {
  return {
    ...animDef,
    tracks: (animDef?.tracks || []).map((track) => ({
      ...track,
      keyframes: (track?.keyframes || []).map((keyframe) => ({
        ...keyframe,
        value: Array.isArray(keyframe?.value) ? [...keyframe.value] : keyframe?.value,
      })),
    })),
  };
}

function getStandardClipLibrary() {
  const skeleton = getSkeletonById('HUMANOID_STANDARD');
  return Array.isArray(skeleton?.animations) ? skeleton.animations : [];
}

function setLibraryClipStatus(message, tone = 'neutral') {
  const status = document.getElementById('anim-mode-library-status');
  if (!status) return;
  const palette = {
    neutral: 'text-zinc-500',
    ok: 'text-[#00ff88]',
    error: 'text-red-400',
  };
  status.className = `${palette[tone] || palette.neutral} text-[9px] leading-relaxed min-h-[1em]`;
  status.textContent = message || '';
}

function syncLibraryClipControls() {
  const select = document.getElementById('anim-mode-library-clip-select');
  const applyButton = document.getElementById('anim-mode-library-apply');
  if (!select || !applyButton) return;

  const clips = getStandardClipLibrary();
  const previousValue = select.value;
  select.replaceChildren();

  clips.forEach((clip) => {
    const option = document.createElement('option');
    option.value = clip.name;
    option.textContent = clip.name;
    select.appendChild(option);
  });

  if ([...select.options].some((option) => option.value === previousValue)) {
    select.value = previousValue;
  } else if ([...select.options].some((option) => option.value === 'walk')) {
    select.value = 'walk';
  }

  const object = state.animationModeObject;
  const eligibility = object ? resolveImportEligibility(object) : { ok: false, error: t('selectGroupForAnimMode') };
  applyButton.disabled = clips.length === 0;
  applyButton.classList.toggle('opacity-50', !eligibility.ok);
  setLibraryClipStatus(
    eligibility.ok
      ? t('standardClipLibraryReady', { count: String(clips.length) })
      : eligibility.error,
    eligibility.ok ? 'neutral' : 'error'
  );
}

function upsertLibraryClip(group, animationDef, clip) {
  const existing = Array.isArray(group.userData.animations) ? group.userData.animations : [];
  const existingClips = Array.isArray(group.userData.animationClips) ? group.userData.animationClips : [];
  const existingIndex = existing.findIndex((anim) => anim?.name === animationDef.name);

  if (existingIndex >= 0) {
    existing[existingIndex] = animationDef;
    existingClips[existingIndex] = clip;
  } else {
    existing.push(animationDef);
    existingClips.push(clip);
  }

  group.userData.animations = existing;
  group.userData.animationClips = existingClips.filter(Boolean);
  return existingIndex >= 0 ? existingIndex : existing.length - 1;
}

const animEditorState = {
  trackKey: '',
  keyframeIndex: 0,
};

const framePointGizmo = {
  proxy: null,
  activeTargetName: '',
  activeTargetNode: null,
  dragActive: false,
  bindingsReady: false,
};

const animModeSectionState = {
  rig: false,
  reference: false,
  pose: false,
  import: false,
  export: false,
};

const animModeViewportState = {
  rigHidden: false,
};

function getRigPreviewDom() {
  return {
    viewport: document.getElementById('anim-mode-rig-viewport'),
    canvas: document.getElementById('anim-mode-rig-canvas'),
    empty: document.getElementById('anim-mode-rig-empty'),
    status: document.getElementById('anim-mode-rig-status'),
  };
}

function setRigPreviewMessage(message, mode = 'idle') {
  const { empty, status } = getRigPreviewDom();
  if (status) {
    status.textContent = message;
    status.className = mode === 'live'
      ? 'text-[#00ff88] text-[8px]'
      : mode === 'error'
        ? 'text-rose-300 text-[8px]'
        : 'text-zinc-500 text-[8px]';
  }
  if (empty) {
    empty.classList.toggle('hidden', mode === 'live');
    if (mode !== 'live') {
      empty.textContent = message;
    }
  }
}

function resizeRigPreviewViewport() {
  const { viewport, canvas } = getRigPreviewDom();
  if (!viewport || !canvas || !rigPreview.renderer || !rigPreview.camera) return false;

  const width = Math.max(viewport.clientWidth || 0, 1);
  const height = Math.max(viewport.clientHeight || 0, 1);
  const resized = canvas.width !== width || canvas.height !== height;

  if (resized) {
    canvas.width = width;
    canvas.height = height;
    rigPreview.renderer.setSize(width, height, false);
    rigPreview.camera.aspect = width / height;
    rigPreview.camera.updateProjectionMatrix();
  }

  return resized;
}

function frameRigPreviewCamera(object3D, fallbackCenter = new THREE.Vector3(0, 1.8, 0)) {
  if (!rigPreview.camera || !rigPreview.controls) return;

  const box = object3D ? new THREE.Box3().setFromObject(object3D) : null;
  if (!box || box.isEmpty()) {
    rigPreview.focusCenter.copy(fallbackCenter);
    rigPreview.controls.target.copy(fallbackCenter);
    rigPreview.camera.position.copy(fallbackCenter).add(new THREE.Vector3(6, 5, 8));
    rigPreview.camera.lookAt(fallbackCenter);
    rigPreview.controls.update();
    return;
  }

  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxSize = Math.max(size.x, size.y, size.z, 1);
  const fitHeight = maxSize / (2 * Math.tan(THREE.MathUtils.degToRad(rigPreview.camera.fov / 2)));
  const fitWidth = fitHeight / Math.max(rigPreview.camera.aspect, 0.1);
  const distance = Math.max(fitHeight, fitWidth, 4) * 1.35;
  const offset = new THREE.Vector3(1.05, 0.8, 1.1).normalize().multiplyScalar(distance);

  rigPreview.focusCenter.copy(center);
  rigPreview.controls.target.copy(center);
  rigPreview.camera.position.copy(center).add(offset);
  rigPreview.camera.lookAt(center);
  rigPreview.controls.update();
}

function ensureRigPreviewRuntime() {
  const { canvas } = getRigPreviewDom();
  if (!canvas || rigPreview.renderer) return;

  rigPreview.scene = new THREE.Scene();
  rigPreview.scene.add(new THREE.AmbientLight(0xffffff, 0.45));
  rigPreview.scene.add(new THREE.GridHelper(20, 20, 0x444444, 0x333333));

  rigPreview.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 200);
  rigPreview.camera.position.set(8, 6, 10);

  rigPreview.renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    alpha: false,
  });
  rigPreview.renderer.setSize(1, 1, false);

  rigPreview.controls = new OrbitControls(rigPreview.camera, canvas);
  rigPreview.controls.enableDamping = true;

  resizeRigPreviewViewport();
  ensureRigPreviewBindings();
}

function disposeRigPreviewHelper() {
  if (rigPreview.helperGroup && rigPreview.scene) {
    rigPreview.scene.remove(rigPreview.helperGroup);
  }
  rigPreview.helperGroup = null;
  rigPreview.boneEntries = [];
  rigPreview.lineEntries = [];
  rigPreview.targetMap = {};
  rigPreview.nodeLookup = new Map();
  rigPreview.skeleton = null;
  rigPreview.group = null;
  rigPreview.selectedBoneName = '';
  rigPreview.selectedTargetName = '';
}

function disposeRigPreviewRuntime() {
  if (rigPreview.frameId) {
    cancelAnimationFrame(rigPreview.frameId);
    rigPreview.frameId = 0;
  }
  rigPreview.dragActive = false;
  rigPreview.dragMoved = false;
  rigPreview.dragBoneName = '';
  rigPreview.dragTargetName = '';
  rigPreview.dragTargetNode = null;
  disposeRigPreviewHelper();
  rigPreview.controls?.dispose?.();
  rigPreview.renderer?.dispose?.();
  rigPreview.renderer = null;
  rigPreview.scene = null;
  rigPreview.camera = null;
  rigPreview.controls = null;
}

function sanitizeFileStem(value, fallback = 'animation') {
  const normalized = String(value || fallback)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return normalized || fallback;
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

function syncRigPreviewCameraToMainViewport() {
  if (!state.camera || !rigPreview.camera) return;

  rigPreview.camera.fov = state.camera.fov;
  rigPreview.camera.near = state.camera.near;
  rigPreview.camera.far = state.camera.far;
  rigPreview.camera.zoom = state.camera.zoom;
  rigPreview.camera.up.copy(state.camera.up);
  rigPreview.camera.position.copy(state.camera.position);
  rigPreview.camera.quaternion.copy(state.camera.quaternion);
  rigPreview.camera.updateProjectionMatrix();
}

function syncAnimModeSplitClasses() {
  syncAnimModeLayoutSplitClasses(animModeViewportState);
}

function applyAnimModeSectionState(sectionKey) {
  applyAnimModeLayoutSectionState(animModeSectionState, sectionKey);
}

function syncAnimModeSectionStates() {
  syncAnimModeLayoutSectionStates(animModeSectionState);
}

function ensureAnimationModeLayout() {
  ensureAnimationModePanelLayout({
    animModeSectionState,
    animModeViewportState,
    resizeRigPreviewViewport,
  });
}

function scheduleAnimModeLayoutResize() {
  scheduleAnimationModeLayoutResize(resizeRigPreviewViewport);
}

export function animModeToggleSection(sectionKey) {
  if (!(sectionKey in animModeSectionState)) return;
  animModeSectionState[sectionKey] = !animModeSectionState[sectionKey];
  applyAnimModeSectionState(sectionKey);
  scheduleAnimModeLayoutResize();
}

export function animModeToggleRigViewport() {
  animModeViewportState.rigHidden = !animModeViewportState.rigHidden;
  syncAnimModeSplitClasses();
  scheduleAnimModeLayoutResize();
}

function ensureFramePointProxy() {
  if (framePointGizmo.proxy) return framePointGizmo.proxy;
  const proxy = new THREE.Object3D();
  proxy.name = '__ANIM_FRAME_POINT_PROXY__';
  proxy.userData.isAnimFrameProxy = true;
  proxy.visible = false;
  state.scene?.add(proxy);
  framePointGizmo.proxy = proxy;
  return proxy;
}

function clearFramePointGizmo({ reattachSelection = false } = {}) {
  framePointGizmo.activeTargetName = '';
  framePointGizmo.activeTargetNode = null;
  framePointGizmo.dragActive = false;
  if (framePointGizmo.proxy) {
    framePointGizmo.proxy.visible = false;
  }
  if (state.transformControls?.object?.userData?.isAnimFrameProxy) {
    state.transformControls.detach();
  }
  if (reattachSelection && state.selectedMesh && !state.animationMode) {
    state.transformControls.attach(state.selectedMesh);
  }
}

function syncFramePointProxyToSelection() {
  if (!state.animationMode || !framePointGizmo.activeTargetNode) return;
  const proxy = ensureFramePointProxy();
  const worldPosition = new THREE.Vector3();
  framePointGizmo.activeTargetNode.getWorldPosition(worldPosition);
  proxy.position.copy(worldPosition);
  proxy.rotation.set(0, 0, 0);
  proxy.scale.set(1, 1, 1);
  proxy.visible = true;

  if (state.transformControls.object !== proxy) {
    state.transformControls.attach(proxy);
  }
  state.transformControls.setMode('translate');
}

function ensureFramePointGizmoBindings() {
  if (framePointGizmo.bindingsReady || !state.transformControls) return;

  state.transformControls.addEventListener('dragging-changed', (event) => {
    const obj = state.transformControls.object;
    if (!obj?.userData?.isAnimFrameProxy) return;

    framePointGizmo.dragActive = !!event.value;
    if (!event.value && framePointGizmo.activeTargetName) {
      commitAnimationEditorClip(`Saved ${framePointGizmo.activeTargetName} at frame ${animEditorState.keyframeIndex + 1}.`);
      syncFramePointProxyToSelection();
    }
  });

  state.transformControls.addEventListener('change', () => {
    const obj = state.transformControls.object;
    if (!obj?.userData?.isAnimFrameProxy || !framePointGizmo.dragActive || !framePointGizmo.activeTargetNode) return;

    const localPoint = obj.position.clone();
    const parentNode = framePointGizmo.activeTargetNode.parent || state.animationModeObject;
    parentNode.worldToLocal(localPoint);

    applyPointPositionToCurrentFrame(
      framePointGizmo.activeTargetName,
      [localPoint.x, localPoint.y, localPoint.z],
      { compile: false }
    );
  });

  framePointGizmo.bindingsReady = true;
}

function getAnimEditorDom() {
  return {
    panel: document.getElementById('anim-mode-editor'),
    trackSelect: document.getElementById('anim-mode-track-select'),
    frameSlider: document.getElementById('anim-mode-keyframe-slider'),
    frameLabel: document.getElementById('anim-mode-editor-frame-label'),
    xInput: document.getElementById('anim-mode-keyframe-x'),
    yInput: document.getElementById('anim-mode-keyframe-y'),
    zInput: document.getElementById('anim-mode-keyframe-z'),
    status: document.getElementById('anim-mode-editor-status'),
  };
}

function getEditablePointEntries(group = state.animationModeObject) {
  if (!group?.isGroup) return [];

  const entries = [];
  const seenTargets = new Set();
  const sourceEntries = rigPreview.group === group && rigPreview.boneEntries.length
    ? rigPreview.boneEntries
    : [];

  sourceEntries.forEach((entry) => {
    const targetName = rigPreview.targetMap?.[entry.bone.name] || entry.targetName || '';
    if (!targetName || seenTargets.has(targetName)) return;
    seenTargets.add(targetName);
    entries.push({
      boneName: entry.bone.name,
      targetName,
      label: targetName,
    });
  });

  if (entries.length > 0) {
    return entries;
  }

  const nodeLookup = buildNamedNodeLookup(group);
  return Array.from(nodeLookup.keys()).map((targetName) => ({
    boneName: targetName,
    targetName,
    label: targetName,
  }));
}

function setAnimEditorStatus(message, mode = 'idle') {
  const { status } = getAnimEditorDom();
  if (!status) return;
  status.textContent = message;
  status.className = mode === 'error'
    ? 'text-rose-300 text-[9px] leading-relaxed mt-2 min-h-[1em]'
    : mode === 'success'
      ? 'text-[#00ff88] text-[9px] leading-relaxed mt-2 min-h-[1em]'
      : 'text-zinc-500 text-[9px] leading-relaxed mt-2 min-h-[1em]';
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

function applyAnimationDefinitionAtTime(group, animationDef, time) {
  if (!group || !animationDef) return;

  restoreGroupLocalPoseSnapshot(group);

  (animationDef.tracks || []).forEach((track) => {
    const node = findAnimationTargetNode(group, track.target);
    if (!node) return;

    const value = sampleTrackValue(track, time);
    if (!Array.isArray(value)) return;

    if (track.property === 'position' && value.length >= 3) {
      node.position.set(value[0] ?? 0, value[1] ?? 0, value[2] ?? 0);
    } else if (track.property === 'rotation' && value.length >= 3) {
      node.rotation.set(value[0] ?? 0, value[1] ?? 0, value[2] ?? 0);
    } else if (track.property === 'scale' && value.length >= 3) {
      node.scale.set(value[0] ?? 1, value[1] ?? 1, value[2] ?? 1);
    }
  });

  group.updateWorldMatrix(true, true);
}

function getCurrentAnimationEditorContext() {
  const object = state.animationModeObject;
  const animationIndex = getAnimSelectIdx();
  const animationDef = object?.userData?.animations?.[animationIndex] || null;
  if (!object || !animationDef) {
    return {
      object: null,
      animationIndex: -1,
      animationDef: null,
      frameTimes: [0],
      selectedTime: 0,
      pointEntries: [],
      selectedPointEntry: null,
      selectedPointNode: null,
      selectedPositionTrack: null,
      selectedValue: [0, 0, 0],
    };
  }
  const frameTimes = collectAnimationFrameTimes(animationDef);
  animEditorState.keyframeIndex = THREE.MathUtils.clamp(
    animEditorState.keyframeIndex,
    0,
    Math.max(frameTimes.length - 1, 0)
  );
  const selectedTime = frameTimes[animEditorState.keyframeIndex] ?? 0;
  const pointEntries = getEditablePointEntries(object);
  const preferredPointEntry = pointEntries.find((entry) => ['CHEST', 'TORSO', 'HEAD', 'NECK', 'PELVIS'].includes(entry.targetName))
    || pointEntries[0]
    || null;
  const selectedPointEntry = pointEntries.find((entry) => entry.targetName === animEditorState.trackKey)
    || preferredPointEntry
    || pointEntries.find((entry) => entry.targetName === rigPreview.selectedTargetName)
    || null;

  if (selectedPointEntry) {
    animEditorState.trackKey = selectedPointEntry.targetName;
  } else {
    animEditorState.trackKey = '';
  }

  const selectedPointNode = selectedPointEntry ? findAnimationTargetNode(object, selectedPointEntry.targetName) : null;
  const selectedPositionTrack = selectedPointEntry
    ? (animationDef.tracks || []).find((track) => track.target === selectedPointEntry.targetName && track.property === 'position') || null
    : null;
  const sampledValue = Array.isArray(sampleTrackValue(selectedPositionTrack, selectedTime))
    ? sampleTrackValue(selectedPositionTrack, selectedTime)
    : null;
  const selectedValue = sampledValue
    || (selectedPointNode ? selectedPointNode.position.toArray() : [0, 0, 0]);

  return {
    object,
    animationIndex,
    animationDef,
    frameTimes,
    selectedTime,
    pointEntries,
    selectedPointEntry,
    selectedPointNode,
    selectedPositionTrack,
    selectedValue,
  };
}

function refreshAnimModeEditor({ previewFrame = true } = {}) {
  const dom = getAnimEditorDom();
  if (!dom.panel) return;

  const context = getCurrentAnimationEditorContext();
  const {
    object,
    animationDef,
    frameTimes,
    selectedTime,
    pointEntries,
    selectedPointEntry,
    selectedValue,
  } = context;

  if (dom.trackSelect) {
    dom.trackSelect.innerHTML = '';
    if (pointEntries.length === 0) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = 'SELECT POINT';
      dom.trackSelect.appendChild(option);
    } else {
      pointEntries.forEach((entry) => {
        const option = document.createElement('option');
        option.value = entry.targetName;
        option.textContent = entry.label;
        dom.trackSelect.appendChild(option);
      });
    }
    dom.trackSelect.value = selectedPointEntry?.targetName || '';
    dom.trackSelect.disabled = pointEntries.length === 0;
  }

  const frameCount = frameTimes.length;
  if (dom.frameSlider) {
    dom.frameSlider.min = '0';
    dom.frameSlider.max = String(Math.max(frameCount - 1, 0));
    dom.frameSlider.value = String(Math.min(animEditorState.keyframeIndex, Math.max(frameCount - 1, 0)));
    dom.frameSlider.disabled = frameCount === 0;
  }

  if (dom.frameLabel) {
    if (frameCount > 0) {
      dom.frameLabel.textContent = `FRAME ${animEditorState.keyframeIndex + 1}/${frameCount} @ ${selectedTime.toFixed(2)}s`;
    } else {
      dom.frameLabel.textContent = 'NO FRAME';
    }
  }

  [dom.xInput, dom.yInput, dom.zInput].forEach((input, index) => {
    if (!input) return;
    input.value = String(selectedValue[index] ?? 0);
    input.disabled = !selectedPointEntry;
  });

  if (!object || !animationDef || !selectedPointEntry) {
    setAnimEditorStatus('Select a clip and a point to edit this frame.');
    return;
  }

  if (selectedPointEntry.targetName && rigPreview.selectedTargetName !== selectedPointEntry.targetName) {
    const rigEntry = getRigPreviewEntryForTarget(selectedPointEntry.targetName);
    if (rigEntry) {
      setRigPreviewSelection(rigEntry, { syncEditor: false });
    }
  }

  if (previewFrame) {
    stopAnimation();
    applyAnimationDefinitionAtTime(object, animationDef, selectedTime);
    refreshRigPreview(object);
  }

  setAnimEditorStatus(`Editing point ${selectedPointEntry.targetName} at ${selectedTime.toFixed(2)}s.`);
}

function updateRigPreviewPose() {
  if (!rigPreview.group || !rigPreview.helperGroup) return;

  const worldPosition = new THREE.Vector3();
  const accumulatedCenter = new THREE.Vector3();
  let visibleCount = 0;
  rigPreview.group.updateWorldMatrix(true, true);

  rigPreview.boneEntries.forEach((entry) => {
    const boneName = entry.bone.name;
    const targetName = rigPreview.targetMap[boneName];
    const targetNode = targetName ? rigPreview.nodeLookup.get(targetName) : null;

    if (targetNode) {
      targetNode.getWorldPosition(worldPosition);
      entry.node.position.copy(worldPosition);
      entry.node.visible = true;
      accumulatedCenter.add(worldPosition);
      visibleCount += 1;
      return;
    }

    entry.node.position.copy(rigPreview.group.localToWorld(entry.restPosition.clone()));
    entry.node.visible = true;
    accumulatedCenter.add(entry.node.position);
    visibleCount += 1;
  });

  rigPreview.lineEntries.forEach(({ parentEntry, childEntry, line }) => {
    const positions = line.geometry.attributes.position;
    positions.setXYZ(0, parentEntry.node.position.x, parentEntry.node.position.y, parentEntry.node.position.z);
    positions.setXYZ(1, childEntry.node.position.x, childEntry.node.position.y, childEntry.node.position.z);
    positions.needsUpdate = true;
    line.geometry.computeBoundingSphere();
    line.visible = parentEntry.node.visible && childEntry.node.visible;
  });

  updateRigPreviewSelectionVisuals();
  if (visibleCount > 0) {
    rigPreview.focusCenter.copy(accumulatedCenter.multiplyScalar(1 / visibleCount));
  }
}

function updateRigPreviewSelectionVisuals() {
  rigPreview.boneEntries.forEach((entry) => {
    const isSelected = !!rigPreview.selectedTargetName && entry.targetName === rigPreview.selectedTargetName;
    entry.sphere.material.color.setHex(isSelected ? 0xffcc00 : 0x00ffff);
    entry.sphere.material.wireframe = !isSelected;
    entry.sphere.scale.setScalar(isSelected ? 1.35 : 1);
  });
}

function setRigPreviewSelection(entry, { syncEditor = true } = {}) {
  rigPreview.selectedBoneName = entry?.bone?.name || '';
  rigPreview.selectedTargetName = entry?.targetName || '';
  framePointGizmo.activeTargetName = entry?.targetName || '';
  framePointGizmo.activeTargetNode = entry?.targetName && rigPreview.group
    ? findAnimationTargetNode(rigPreview.group, entry.targetName)
    : null;
  updateRigPreviewSelectionVisuals();

  if (syncEditor && rigPreview.selectedTargetName) {
    animEditorState.trackKey = rigPreview.selectedTargetName;
    refreshAnimModeEditor({ previewFrame: false });
  }

  syncFramePointProxyToSelection();

  const hint = document.getElementById('anim-mode-rig-hint');
  if (hint) {
    hint.textContent = rigPreview.selectedTargetName
      ? `Selected ${rigPreview.selectedTargetName}. Move it with the viewport gizmo or tweak X/Y/Z below.`
      : 'Click a point to edit it. Move it with the viewport gizmo to record that frame.';
  }
}

function getRigPreviewEntryForTarget(targetName) {
  return rigPreview.boneEntries.find((entry) => entry.targetName === targetName) || null;
}

function setRigPreviewPointerFromEvent(event) {
  const { canvas } = getRigPreviewDom();
  if (!canvas || !rigPreview.camera) return false;
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return false;

  rigPreview.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  rigPreview.pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
  rigPreview.raycaster.setFromCamera(rigPreview.pointer, rigPreview.camera);
  return true;
}

function pickRigPreviewEntry(event) {
  if (!setRigPreviewPointerFromEvent(event)) return null;
  const intersections = rigPreview.raycaster.intersectObjects(
    rigPreview.boneEntries.map((entry) => entry.sphere),
    false
  );
  if (!intersections.length) return null;

  const hitSphere = intersections[0].object;
  return rigPreview.boneEntries.find((entry) => entry.sphere === hitSphere) || null;
}

function commitAnimationEditorClip(successMessage = '') {
  const context = getCurrentAnimationEditorContext();
  const { object, animationIndex, animationDef, selectedTime } = context;
  if (!object || !animationDef) return false;

  const clip = compileAnimation(animationDef, object);
  if (!clip) {
    setAnimEditorStatus('Could not rebuild the clip after editing this frame.', 'error');
    return false;
  }

  if (!object.userData.animationClips) {
    object.userData.animationClips = [];
  }
  object.userData.animationClips[animationIndex] = clip;
  stopAnimation();
  applyAnimationDefinitionAtTime(object, animationDef, selectedTime);
  refreshRigPreview(object);
  syncFramePointProxyToSelection();
  refreshAnimationList();
  showTimelineForGroup(object);
  if (successMessage) {
    setAnimEditorStatus(successMessage, 'success');
  }
  return true;
}

function applyPointPositionToCurrentFrame(targetName, nextValue, { compile = true, statusMessage = '' } = {}) {
  const context = getCurrentAnimationEditorContext();
  const { object, animationDef, selectedTime } = context;
  if (!object || !animationDef || !targetName || !Array.isArray(nextValue)) {
    return false;
  }

  const restSnapshot = ensureAnimModeRestPoseSnapshot(object);
  const restPosition = restSnapshot.get(targetName)?.position?.toArray?.() || [0, 0, 0];
  upsertVectorTrackKeyframe(animationDef, targetName, 'position', selectedTime, nextValue, restPosition);

  const targetNode = findAnimationTargetNode(object, targetName);
  if (targetNode) {
    targetNode.position.set(nextValue[0] ?? 0, nextValue[1] ?? 0, nextValue[2] ?? 0);
    object.updateWorldMatrix(true, true);
  } else {
    applyAnimationDefinitionAtTime(object, animationDef, selectedTime);
  }

  if (!compile) {
    updateRigPreviewPose();
    refreshAnimModeEditor({ previewFrame: false });
    return true;
  }

  return commitAnimationEditorClip(statusMessage);
}

function ensureRigPreviewBindings() {
  if (rigPreview.bindingsReady) return;
  const { canvas } = getRigPreviewDom();
  if (!canvas) return;

  canvas.addEventListener('pointerdown', (event) => {
    if (!state.animationMode || event.button !== 0) return;
    const entry = pickRigPreviewEntry(event);
    if (!entry) return;
    event.preventDefault();
    setRigPreviewSelection(entry);
  });

  rigPreview.bindingsReady = true;
}

function startRigPreviewLoop() {
  if (rigPreview.frameId) return;

  const animate = () => {
    if (!state.animationMode || !rigPreview.renderer || !rigPreview.scene || !rigPreview.camera) {
      rigPreview.frameId = 0;
      return;
    }

    rigPreview.frameId = requestAnimationFrame(animate);
    resizeRigPreviewViewport();
    updateRigPreviewPose();
    if (isAnimModeSplitPreviewActive()) {
      rigPreview.controls.enabled = false;
      syncRigPreviewCameraToMainViewport();
    } else {
      rigPreview.controls.enabled = true;
      rigPreview.controls?.update();
    }
    rigPreview.renderer.render(rigPreview.scene, rigPreview.camera);
  };

  animate();
}

function refreshRigPreview(group = state.animationModeObject) {
  const desiredTargetName = rigPreview.selectedTargetName || animEditorState.trackKey || '';
  ensureRigPreviewRuntime();
  disposeRigPreviewHelper();

  if (!group?.isGroup) {
    setRigPreviewMessage('Select a group to preview its rig.', 'idle');
    return;
  }

  const skeletonId = group.userData?.skeletonId || null;
  const skeleton = skeletonId ? getSkeletonById(skeletonId) : null;
  if (!skeleton?.bones?.length) {
    setRigPreviewMessage('This group has no skeleton assigned.', 'error');
    return;
  }

  const restWorldPositions = computeSkeletonWorldPositions(skeleton);
  const { helperGroup, boneEntries, lineEntries } = buildRigPreviewHelper(skeleton, restWorldPositions);
  const slotMap = group.userData?.slotMap || {};
  const slotBindings = group.userData?.slotBindings || skeleton.defaultBindings || {};

  rigPreview.group = group;
  rigPreview.skeleton = skeleton;
  rigPreview.targetMap = buildBoneToTargetMap(group, slotMap, slotBindings);
  rigPreview.nodeLookup = buildNamedNodeLookup(group);
  rigPreview.helperGroup = helperGroup;
  rigPreview.boneEntries = boneEntries.map((entry) => ({
    ...entry,
    targetName: rigPreview.targetMap[entry.bone.name] || '',
  }));
  rigPreview.lineEntries = lineEntries;
  rigPreview.scene.add(helperGroup);

  updateRigPreviewPose();
  if (desiredTargetName) {
    const desiredEntry = rigPreview.boneEntries.find((entry) => entry.targetName === desiredTargetName) || null;
    if (desiredEntry) {
      setRigPreviewSelection(desiredEntry, { syncEditor: false });
    } else {
      clearFramePointGizmo();
      updateRigPreviewSelectionVisuals();
    }
  } else {
    updateRigPreviewSelectionVisuals();
  }
  rigPreview.focusCenter.copy(new THREE.Box3().setFromObject(helperGroup).getCenter(new THREE.Vector3()));
  frameRigPreviewCamera(helperGroup);
  setRigPreviewMessage('LIVE', 'live');
  startRigPreviewLoop();
}

export function getAnimModeRigPreviewDiagnostics() {
  const { viewport, canvas, empty, status } = getRigPreviewDom();
  const splitHost = document.getElementById('anim-mode-preview-split');
  const modelStage = document.getElementById('anim-mode-model-stage');
  const rigStage = document.getElementById('anim-mode-rig-stage');
  return {
    animationMode: !!state.animationMode,
    groupTemplateId: rigPreview.group?.userData?.templateId || null,
    skeletonId: rigPreview.skeleton?.id || null,
    hasRenderer: !!rigPreview.renderer,
    hasScene: !!rigPreview.scene,
    hasCamera: !!rigPreview.camera,
    helperAttached: !!(rigPreview.helperGroup && rigPreview.scene?.children?.includes(rigPreview.helperGroup)),
    boneCount: rigPreview.boneEntries.length,
    lineCount: rigPreview.lineEntries.length,
    mappedBoneCount: Object.keys(rigPreview.targetMap || {}).length,
    selectedTargetName: rigPreview.selectedTargetName || '',
    splitHidden: !!splitHost?.classList.contains('hidden'),
    modelStageHidden: !!modelStage?.classList.contains('hidden'),
    rigStageHidden: !!rigStage?.classList.contains('hidden'),
    viewportSize: viewport
      ? { width: viewport.clientWidth || 0, height: viewport.clientHeight || 0 }
      : { width: 0, height: 0 },
    canvasSize: canvas
      ? {
          clientWidth: canvas.clientWidth || 0,
          clientHeight: canvas.clientHeight || 0,
          width: canvas.width || 0,
          height: canvas.height || 0,
        }
      : { clientWidth: 0, clientHeight: 0, width: 0, height: 0 },
    statusText: status?.textContent || '',
    emptyHidden: !!empty?.classList.contains('hidden'),
  };
}

export function showTimelineForGroup(group) {
  const timeline = document.getElementById('animation-timeline');
  if (!timeline) return;
  if (!group || !group.userData?.animationClips?.length) {
    timeline.classList.add('hidden');
    refreshAnimModeEditor({ previewFrame: false });
    return;
  }
  timeline.classList.remove('hidden');
  const select = document.getElementById('anim-select');
  if (select) {
    const previousValue = select.value;
    select.innerHTML = '';
    group.userData.animations.forEach((anim, i) => {
      const option = document.createElement('option');
      option.value = i;
      option.textContent = anim.name || `Anim ${i + 1}`;
      select.appendChild(option);
    });
    if ([...select.options].some((option) => option.value === previousValue)) {
      select.value = previousValue;
    }
  }
  refreshAnimModeEditor();
}

export function getAnimGroup() {
  return state.animationMode ? state.animationModeObject : state.selectedMesh;
}

export function getAnimSelectIdx() {
  const select = document.getElementById('anim-select');
  return select ? parseInt(select.value, 10) || 0 : 0;
}

export function playAnim() {
  const group = getAnimGroup();
  if (!group || !group.userData?.animationClips?.length) return;
  stopAnimation();
  playAnimation(group, getAnimSelectIdx());
}

export function stopAnim() {
  stopAnimation();
}

export function onAnimSelectChange() {
  const group = getAnimGroup();
  if (!group || !group.userData?.animationClips?.length) return;
  if (state.animationPlaying) {
    stopAnimation();
    playAnimation(group, getAnimSelectIdx());
    refreshAnimModeEditor({ previewFrame: false });
    refreshAnimationList();
    return;
  }
  refreshAnimModeEditor();
  refreshAnimationList();
}

export function enterAnimationMode() {
  const object = state.selectedMesh;
  if (!object || !object.isGroup) {
    showToast(t('selectGroupForAnimMode'));
    return;
  }

  ensureAnimationModeLayout();
  ensureFramePointGizmoBindings();
  stopAnimation();
  state.animationMode = true;
  state.animationModeObject = object;
  object.userData.animModeRestPoseSnapshot = captureGroupLocalPoseSnapshot(object);

  state.userObjects.children.forEach((child) => {
    if (child !== object) child.visible = false;
  });

  selectMesh(object);
  centerCameraOnSelected();

  const objectName = object.userData.name || 'Grupo';
  document.getElementById('left-panel')?.classList.add('hidden');
  document.getElementById('properties-panel')?.classList.add('hidden');
  document.getElementById('scene-info-view')?.classList.add('hidden');
  document.getElementById('anim-mode-preview-split')?.classList.remove('hidden');
  document.getElementById('anim-mode-rig-panel')?.classList.remove('hidden');
  document.getElementById('anim-mode-tools-panel')?.classList.remove('hidden');
  document.getElementById('anim-mode-panel')?.classList.remove('hidden');
  document.getElementById('anim-mode-bottom-dock')?.classList.remove('hidden');
  document.getElementById('anim-mode-banner')?.classList.remove('hidden');
  syncAnimModeSplitClasses();
  document.getElementById('anim-mode-obj-name').textContent = objectName;
  document.getElementById('anim-mode-banner-name').textContent = objectName;
  const leftToggleIcon = document.getElementById('toggle-left-icon');
  const rightToggleIcon = document.getElementById('toggle-right-icon');
  if (leftToggleIcon) {
    leftToggleIcon.innerHTML = document.getElementById('anim-mode-panel')?.classList.contains('panel-collapsed') ? '&#9654;' : '&#9664;';
  }
  if (rightToggleIcon) {
    rightToggleIcon.innerHTML = document.getElementById('right-panel')?.classList.contains('panel-collapsed') ? '&#9664;' : '&#9654;';
  }
  clearFramePointGizmo();
  state.transformControls.detach();

  ensureReferenceVideoBindings();
  ensurePoseLibraryLoaded();
  updateReferenceVideoUi();
  refreshPoseLibraryUi();
  refreshAnimationList();
  showTimelineForGroup(object);
  refreshRigPreview(object);
  scheduleAnimModeLayoutResize();
  showToast(t('animModeLabel') + (object.userData.name || 'Group'));
}

export function exitAnimationMode() {
  if (!state.animationMode) return;
  stopAnimation();
  pauseReferenceVideo();
  restoreGroupLocalPoseSnapshot(state.animationModeObject);

  state.userObjects.children.forEach((child) => {
    child.visible = true;
  });

  state.animationMode = false;
  state.animationModeObject = null;

  restoreDefaultAnimationModeLayout();
  document.getElementById('left-panel')?.classList.remove('hidden');
  document.getElementById('anim-mode-rig-panel')?.classList.add('hidden');
  document.getElementById('anim-mode-tools-panel')?.classList.add('hidden');
  document.getElementById('anim-mode-panel')?.classList.add('hidden');
  document.getElementById('anim-mode-bottom-dock')?.classList.add('hidden');
  document.getElementById('anim-mode-banner')?.classList.add('hidden');
  const leftToggleIcon = document.getElementById('toggle-left-icon');
  const rightToggleIcon = document.getElementById('toggle-right-icon');
  if (leftToggleIcon) {
    leftToggleIcon.innerHTML = document.getElementById('left-panel')?.classList.contains('panel-collapsed') ? '&#9654;' : '&#9664;';
  }
  if (rightToggleIcon) {
    rightToggleIcon.innerHTML = document.getElementById('right-panel')?.classList.contains('panel-collapsed') ? '&#9664;' : '&#9654;';
  }
  clearFramePointGizmo({ reattachSelection: true });
  disposeRigPreviewRuntime();
  animEditorState.trackKey = '';
  animEditorState.keyframeIndex = 0;

  if (state.selectedMesh) {
    document.getElementById('properties-panel')?.classList.remove('hidden');
    showTimelineForGroup(state.selectedMesh);
  } else {
    document.getElementById('scene-info-view')?.classList.remove('hidden');
  }

  scheduleAnimModeLayoutResize();
  showToast(t('backToScene'));
}

export function refreshAnimationList() {
  const list = document.getElementById('anim-mode-list');
  if (!list) return;
  list.replaceChildren();
  syncLibraryClipControls();

  const object = state.animationModeObject;
  if (!object) return;

  const animations = object.userData.animations || [];
  const activeIndex = getAnimSelectIdx();
  if (animations.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'text-zinc-500 text-[10px]';
    empty.textContent = t('noAnimations');
    list.appendChild(empty);
    return;
  }

  animations.forEach((anim, index) => {
    const row = document.createElement('div');
    const isActive = index === activeIndex;
    row.className = isActive
      ? 'flex items-center gap-2 bg-zinc-800 border border-[#ffcc00] px-3 py-2 rounded cursor-pointer'
      : 'flex items-center gap-2 bg-zinc-800 border border-zinc-700 px-3 py-2 rounded cursor-pointer hover:border-[#00ff88]/60';
    row.addEventListener('click', () => {
      const select = document.getElementById('anim-select');
      if (select) {
        select.value = String(index);
      }
      onAnimSelectChange();
      refreshAnimationList();
    });

    const name = document.createElement('span');
    name.className = 'flex-1 text-[10px] text-white truncate';
    name.textContent = anim.name || `Anim ${index + 1}`;

    const duration = document.createElement('span');
    duration.className = 'text-[10px] text-zinc-400';
    duration.textContent = anim.duration ? `${anim.duration.toFixed(1)}s` : '';

    const tracks = document.createElement('span');
    tracks.className = 'text-[10px] text-zinc-500';
    tracks.textContent = anim.tracks ? `${anim.tracks.length}t` : '';

    const playButton = document.createElement('button');
    playButton.className = 'retro-button bg-[#ffcc00] text-black px-2 py-0.5 text-[10px] font-bold';
    playButton.textContent = 'PLAY';
    playButton.addEventListener('click', (event) => {
      event.stopPropagation();
      animModePlayClip(index);
    });

    const exportButton = document.createElement('button');
    exportButton.className = 'retro-button bg-zinc-800 text-[#00d0ff] border border-[#00d0ff] px-2 py-0.5 text-[10px]';
    exportButton.textContent = 'FP';
    exportButton.title = 'EXPORT FAST POSER';
    exportButton.addEventListener('click', (event) => {
      event.stopPropagation();
      animModeExportFastPoserClip(index);
    });

    const deleteButton = document.createElement('button');
    deleteButton.className = 'retro-button bg-red-600 text-white px-2 py-0.5 text-[10px]';
    deleteButton.textContent = 'X';
    deleteButton.addEventListener('click', (event) => {
      event.stopPropagation();
      animModeDeleteClip(index);
    });

    row.append(name, duration, tracks, playButton, exportButton, deleteButton);
    list.appendChild(row);
  });
}

export function animModeApplyLibraryClip() {
  const object = state.animationModeObject;
  const select = document.getElementById('anim-mode-library-clip-select');
  const clipName = String(select?.value || 'walk');

  if (!object) {
    const message = t('selectGroupForAnimMode');
    setLibraryClipStatus(message, 'error');
    showToast(message);
    return;
  }

  const eligibility = resolveImportEligibility(object);
  if (!eligibility.ok) {
    setLibraryClipStatus(eligibility.error, 'error');
    showToast(eligibility.error);
    return;
  }

  const skeleton = getSkeletonById('HUMANOID_STANDARD');
  const sourceClip = getStandardClipLibrary().find((clip) => clip.name === clipName);
  if (!skeleton || !sourceClip) {
    const message = t('standardClipMissing');
    setLibraryClipStatus(message, 'error');
    showToast(message);
    return;
  }

  object.updateWorldMatrix(true, true);
  const slotBindings = mergeSlotBindings(
    skeleton.defaultBindings || {},
    object.userData.slotBindings || {}
  );
  const boneToTarget = buildBoneToTargetMap(
    object,
    object.userData.slotMap,
    slotBindings
  );
  const positionScale = resolveSkeletonPositionScale(skeleton, object, boneToTarget);
  const translated = translateAnimForMesh(sourceClip, object, boneToTarget, { positionScale });
  const animationDef = {
    ...cloneAnimationDef(translated),
    name: sourceClip.name,
    source: 'standard-clip-library',
    sourceSkeletonId: skeleton.id,
    standardClipName: sourceClip.name,
  };

  if (!Array.isArray(animationDef.tracks) || animationDef.tracks.length === 0) {
    const message = t('standardClipNoTracks');
    setLibraryClipStatus(message, 'error');
    showToast(message);
    return;
  }

  const clip = compileAnimation(animationDef, object);
  if (!clip) {
    const message = t('standardClipNoTracks');
    setLibraryClipStatus(message, 'error');
    showToast(message);
    return;
  }

  stopAnimation();
  const index = upsertLibraryClip(object, animationDef, clip);
  showTimelineForGroup(object);
  const timelineSelect = document.getElementById('anim-select');
  if (timelineSelect) timelineSelect.value = String(index);
  refreshAnimationList();
  refreshRigPreview(object);
  refreshAnimModeEditor({ previewFrame: false });
  playAnimation(object, index);

  const message = t('standardClipApplied', { name: sourceClip.name });
  setLibraryClipStatus(message, 'ok');
  showToast(message);
}

export function animModeEditorChangeTrack() {
  const { trackSelect } = getAnimEditorDom();
  animEditorState.trackKey = String(trackSelect?.value || '');
  const selectedEntry = getRigPreviewEntryForTarget(animEditorState.trackKey);
  if (selectedEntry) {
    setRigPreviewSelection(selectedEntry, { syncEditor: false });
  }
  refreshAnimModeEditor({ previewFrame: false });
}

export function animModeEditorScrubFrame() {
  const { frameSlider } = getAnimEditorDom();
  animEditorState.keyframeIndex = Math.max(0, Number.parseInt(frameSlider?.value || '0', 10) || 0);
  refreshAnimModeEditor();
}

export function animModeEditorPrevFrame() {
  animEditorState.keyframeIndex = Math.max(0, animEditorState.keyframeIndex - 1);
  refreshAnimModeEditor();
}

export function animModeEditorNextFrame() {
  const { frameTimes } = getCurrentAnimationEditorContext();
  const maxIndex = Math.max((frameTimes?.length || 1) - 1, 0);
  animEditorState.keyframeIndex = Math.min(maxIndex, animEditorState.keyframeIndex + 1);
  refreshAnimModeEditor();
}

export function animModeEditorPreviewFrame() {
  refreshAnimModeEditor({ previewFrame: true });
}

export function animModeLoadReferenceVideo(event) {
  loadReferenceVideo(event);
}

export function animModeClearReferenceVideo() {
  clearReferenceVideo();
}

export async function animModeToggleReferenceVideoPlayback() {
  await toggleReferenceVideoPlayback();
}

export function animModeReferenceVideoPrevFrame() {
  referenceVideoPrevFrame();
}

export function animModeReferenceVideoNextFrame() {
  referenceVideoNextFrame();
}

export function animModeSetReferenceVideoSpeed(speed) {
  setReferenceVideoSpeed(speed);
}

function getPoseLibraryControllerContext() {
  return {
    getCurrentAnimationEditorContext,
    getKeyframeIndex: () => animEditorState.keyframeIndex,
    applyAnimationDefinitionAtTime,
    refreshRigPreview,
    refreshAnimationList,
    showTimelineForGroup,
    refreshAnimModeEditor,
  };
}

export function animModeSelectPose() {
  selectPose();
}

export function animModeSavePoseToLibrary() {
  savePoseToLibrary();
}

export function animModePreviewPose() {
  previewPose({ refreshRigPreview });
}

export function animModeApplyPoseToFrame() {
  applyPoseToFrame(getPoseLibraryControllerContext());
}

export function animModeDeletePose() {
  deletePose();
}

export function animModeExportPoseLibrary() {
  exportPoseLibrary();
}

export async function animModeImportPoseLibrary(event) {
  await importPoseLibrary(event);
}

export function animModePlayClip(index) {
  const object = state.animationModeObject;
  if (!object || !object.userData?.animationClips?.[index]) return;
  const select = document.getElementById('anim-select');
  if (select) select.value = index;
  stopAnimation();
  playAnimation(object, index);
  refreshAnimationList();
}

export function animModeDeleteClip(index) {
  const object = state.animationModeObject;
  if (!object) return;
  stopAnimation();
  if (object.userData.animations) object.userData.animations.splice(index, 1);
  if (object.userData.animationClips) object.userData.animationClips.splice(index, 1);
  refreshAnimationList();
  showTimelineForGroup(object);
  refreshRigPreview(object);
  refreshAnimModeEditor({ previewFrame: false });
  showToast(t('animDeleted'));
}

export function animModeExportFastPoserClip(index) {
  const object = state.animationModeObject;
  const animationDef = object?.userData?.animations?.[index];
  if (!object || !animationDef) return;

  const exported = convertAnimationDefinitionToFastPoserAsset(animationDef, object);
  if (!exported.success) {
    showToast(exported.error || 'Could not export Fast Poser animation');
    return;
  }

  const fileStem = sanitizeFileStem(animationDef.name || `${object.userData?.name || object.name || 'group'}_${index + 1}`);
  downloadJsonFile(exported.data, `${fileStem}.fast-poser.animation.json`);
  showToast('Fast Poser animation exported');
}

export function animModeImportAnim() {
  const text = document.getElementById('anim-mode-textarea')?.value?.trim();
  const errorElement = document.getElementById('anim-mode-import-error');
  if (!text) {
    if (errorElement) errorElement.textContent = t('pasteAnimJson');
    return;
  }

  const object = state.animationModeObject;
  if (!object) {
    if (errorElement) errorElement.textContent = t('noActiveObject');
    return;
  }

  const result = importAnimationToGroup(text, object);
  if (result.success) {
    document.getElementById('anim-mode-textarea').value = '';
    if (errorElement) errorElement.textContent = result.warnings ? result.warnings.join(' | ') : '';
    refreshAnimationList();
    showTimelineForGroup(object);
    refreshRigPreview(object);
    refreshAnimModeEditor();
    return;
  }

  if (errorElement) errorElement.textContent = result.error;
}

export function animModeEditorApply() {
  const context = getCurrentAnimationEditorContext();
  const { selectedPointEntry } = context;
  const dom = getAnimEditorDom();
  if (!selectedPointEntry) {
    setAnimEditorStatus('Select a point before saving this frame.', 'error');
    return;
  }

  const nextValue = [
    Number.parseFloat(dom.xInput?.value || '0') || 0,
    Number.parseFloat(dom.yInput?.value || '0') || 0,
    Number.parseFloat(dom.zInput?.value || '0') || 0,
  ];

  applyPointPositionToCurrentFrame(
    selectedPointEntry.targetName,
    nextValue,
    { compile: true, statusMessage: `Saved ${selectedPointEntry.targetName} at frame ${animEditorState.keyframeIndex + 1}.` }
  );
}
