import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { state } from '../shared/state.js';
import { showToast } from '../shared/ui-helpers.js';
import { t } from '../shared/i18n.js';
import { stopAnimation, playAnimation, compileAnimation } from './animation.js';
import { importAnimationToGroup } from './animation-import.js';
import {
  FAST_POSER_POSE_LIBRARY_FORMAT,
  FAST_POSER_OUTPUT_JOINTS,
  buildFastPoserPoseEntryFromGroup,
  convertAnimationDefinitionToFastPoserAsset,
  getFastPoserPoseQuaternion,
  hasFastPoserPoseOutputJoint,
  isFastPoserPoseLibrary,
  resolveFastPoserTargetsForGroup,
} from './animateur-animation-import.js';
import { getSkeletonById } from './skeleton-registry.js';
import { buildBoneToTargetMap } from './mesh-animation-translation.js';
import { selectMesh } from '../viewport/selection.js';
import { centerCameraOnSelected } from '../viewport/actions.js';
import { onResize } from '../viewport/scene.js';

const RIG_PREVIEW_BONE_GEO = new THREE.SphereGeometry(0.12, 6, 4);
const RIG_PREVIEW_BONE_MAT = new THREE.MeshBasicMaterial({
  color: 0x00ffff,
  wireframe: true,
  depthTest: false,
});
const RIG_PREVIEW_LINE_MAT = new THREE.LineBasicMaterial({
  color: 0x00ffff,
  depthTest: false,
});

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

const animEditorState = {
  trackKey: '',
  keyframeIndex: 0,
};

const ANIM_MODE_POSE_LIBRARY_STORAGE_KEY = 'lowpoly64-fast-poser-pose-library-v1';

const referenceVideoState = {
  objectUrl: null,
  speed: 0.5,
  bindingsReady: false,
};

const poseLibraryState = {
  loaded: false,
  poses: [],
  selectedPoseId: '',
};

const framePointGizmo = {
  proxy: null,
  activeTargetName: '',
  activeTargetNode: null,
  dragActive: false,
  bindingsReady: false,
};

const DEFAULT_RIGHT_PANEL_CLASS = 'w-72 bg-zinc-900 border-l-4 border-[#ffcc00] p-4 flex flex-col panel overflow-y-auto shrink-0 min-h-0';
const ANIM_MODE_RIGHT_PANEL_CLASS = 'bg-zinc-900 border-l-4 border-[#00ff88] p-3 flex flex-col panel overflow-hidden shrink-0 min-h-0';
const ANIM_MODE_LEFT_PANEL_CLASS = 'w-72 bg-zinc-900 border-r-4 border-[#00ff88] p-3 flex flex-col panel overflow-hidden shrink-0 hidden min-h-0';
const DEFAULT_VIEWPORT_CLASS = 'flex-1 relative min-w-0';
const ANIM_MODE_VIEWPORT_CLASS = 'relative flex-1 min-w-0 min-h-0 h-full max-h-full overflow-hidden';
const ANIM_MODE_SPLIT_CLASS = 'flex flex-wrap flex-1 min-w-0 min-h-0 h-full max-h-full overflow-hidden';
const ANIM_MODE_SPLIT_HIDDEN_CLASS = `hidden ${ANIM_MODE_SPLIT_CLASS}`;
const ANIM_MODE_MODEL_STAGE_CLASS = 'flex min-w-[16rem] min-h-0 h-full max-h-full basis-1/2 grow shrink overflow-hidden border-r-2 border-[#00ff88]/40';
const ANIM_MODE_MODEL_STAGE_FULL_CLASS = 'flex min-w-0 min-h-0 h-full max-h-full basis-full grow shrink overflow-hidden';
const ANIM_MODE_RIG_STAGE_CLASS = 'flex min-w-[16rem] min-h-0 h-full max-h-full basis-1/2 grow shrink overflow-hidden bg-zinc-950 border-l-2 border-[#00ff88]/40';
const ANIM_MODE_RIG_STAGE_HIDDEN_CLASS = `hidden ${ANIM_MODE_RIG_STAGE_CLASS}`;

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

function buildNamedNodeLookup(group) {
  const lookup = new Map();
  group?.traverse((node) => {
    const name = String(node?.userData?.name || node?.name || '').trim();
    if (name && !lookup.has(name)) {
      lookup.set(name, node);
    }
  });
  return lookup;
}

function getPoseSnapshotName(node) {
  return String(node?.userData?.name || node?.name || '').trim();
}

function captureGroupLocalPoseSnapshot(group) {
  const snapshot = new Map();
  group?.traverse((node) => {
    const name = getPoseSnapshotName(node);
    if (!name || snapshot.has(name)) return;
    snapshot.set(name, {
      position: node.position?.clone?.() || new THREE.Vector3(),
      quaternion: node.quaternion?.clone?.() || new THREE.Quaternion(),
      scale: node.scale?.clone?.() || new THREE.Vector3(1, 1, 1),
    });
  });
  return snapshot;
}

function ensureAnimModeRestPoseSnapshot(group) {
  if (!group?.isGroup) return new Map();
  if (!(group.userData.animModeRestPoseSnapshot instanceof Map)) {
    group.userData.animModeRestPoseSnapshot = captureGroupLocalPoseSnapshot(group);
  }
  return group.userData.animModeRestPoseSnapshot;
}

function restoreGroupLocalPoseSnapshot(group, snapshot = ensureAnimModeRestPoseSnapshot(group)) {
  if (!group?.isGroup || !(snapshot instanceof Map)) return;

  const nodeLookup = buildNamedNodeLookup(group);
  snapshot.forEach((transform, name) => {
    const node = nodeLookup.get(name);
    if (!node || !transform) return;
    node.position.copy(transform.position);
    node.quaternion.copy(transform.quaternion);
    node.scale.copy(transform.scale);
  });

  group.updateWorldMatrix(true, true);
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

function scheduleAnimModeLayoutResize() {
  requestAnimationFrame(() => {
    try {
      onResize?.();
    } catch (error) {
      console.warn('Could not refresh viewport after animation mode layout change.', error);
    }
    resizeRigPreviewViewport();
  });
}

function isAnimModeSplitPreviewActive() {
  const splitHost = document.getElementById('anim-mode-preview-split');
  const rigStage = document.getElementById('anim-mode-rig-stage');
  return !!(state.animationMode && splitHost && rigStage
    && !splitHost.classList.contains('hidden')
    && !rigStage.classList.contains('hidden'));
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
  const previewSplit = document.getElementById('anim-mode-preview-split');
  const modelStage = document.getElementById('anim-mode-model-stage');
  const rigStage = document.getElementById('anim-mode-rig-stage');
  const rigToggleLabels = Array.from(document.querySelectorAll('[onclick*="animModeToggleRigViewport()"]'));
  if (!previewSplit || !modelStage || !rigStage) return;

  previewSplit.className = previewSplit.classList.contains('hidden')
    ? ANIM_MODE_SPLIT_HIDDEN_CLASS
    : ANIM_MODE_SPLIT_CLASS;
  if (animModeViewportState.rigHidden) {
    modelStage.className = ANIM_MODE_MODEL_STAGE_FULL_CLASS;
    rigStage.className = ANIM_MODE_RIG_STAGE_HIDDEN_CLASS;
  } else {
    modelStage.className = ANIM_MODE_MODEL_STAGE_CLASS;
    rigStage.className = ANIM_MODE_RIG_STAGE_CLASS;
  }

  rigToggleLabels.forEach((node) => {
    node.textContent = animModeViewportState.rigHidden ? 'SHOW' : 'HIDE';
  });
}

function applyAnimModeSectionState(sectionKey) {
  const body = document.getElementById(`anim-mode-section-body-${sectionKey}`);
  const arrow = document.getElementById(`anim-mode-section-arrow-${sectionKey}`);
  if (!body || !arrow) return;

  const collapsed = !!animModeSectionState[sectionKey];
  body.classList.toggle('hidden', collapsed);
  arrow.innerHTML = collapsed ? '&#9654;' : '&#9660;';
}

function syncAnimModeSectionStates() {
  ['rig', 'reference', 'pose', 'import', 'export'].forEach(applyAnimModeSectionState);
}

function ensureAnimationModeLayout() {
  const workspace = document.getElementById('main-workspace');
  const viewport = document.getElementById('viewport');
  const previewSplit = document.getElementById('anim-mode-preview-split');
  const modelStage = document.getElementById('anim-mode-model-stage');
  const rigStage = document.getElementById('anim-mode-rig-stage');
  const rightPanel = document.getElementById('right-panel');
  const animPanel = document.getElementById('anim-mode-panel');
  const rigPanel = document.getElementById('anim-mode-rig-panel');
  const toolsHost = document.getElementById('anim-mode-tools-panel');
  const referenceHost = document.getElementById('anim-mode-section-body-reference');
  const poseHost = document.getElementById('anim-mode-section-body-pose');
  const importHost = document.getElementById('anim-mode-section-body-import');
  const exportHost = document.getElementById('anim-mode-section-body-export');
  const timelineHost = document.getElementById('anim-mode-timeline-host');
  const editorHost = document.getElementById('anim-mode-editor-host');
  const timeline = document.getElementById('animation-timeline');
  const editor = document.getElementById('anim-mode-editor');
  const referenceVideo = document.getElementById('anim-mode-reference-video');
  const poseLibrary = document.getElementById('anim-mode-pose-library');
  const importPanel = document.getElementById('anim-mode-import-panel');
  const exportPanel = document.getElementById('anim-mode-export-panel');

  const centerAnchor = previewSplit || viewport;
  if (workspace && centerAnchor && animPanel && animPanel.nextElementSibling !== centerAnchor) {
    workspace.insertBefore(animPanel, centerAnchor);
  }

  if (modelStage && viewport && viewport.parentElement !== modelStage) {
    modelStage.appendChild(viewport);
  }
  if (viewport) {
    viewport.className = ANIM_MODE_VIEWPORT_CLASS;
  }
  if (rigStage && rigPanel && rigPanel.parentElement !== rigStage) {
    rigStage.appendChild(rigPanel);
  }

  if (animPanel) {
    animPanel.className = ANIM_MODE_LEFT_PANEL_CLASS;
  }

  if (rightPanel) {
    rightPanel.className = ANIM_MODE_RIGHT_PANEL_CLASS;
    rightPanel.style.width = '24rem';
  }

  toolsHost?.classList.remove('panel-collapsed');

  if (referenceHost && referenceVideo && referenceVideo.parentElement !== referenceHost) {
    referenceHost.appendChild(referenceVideo);
  }
  if (poseHost && poseLibrary && poseLibrary.parentElement !== poseHost) {
    poseHost.appendChild(poseLibrary);
  }
  if (importHost && importPanel && importPanel.parentElement !== importHost) {
    importHost.appendChild(importPanel);
  }
  if (exportHost && exportPanel && exportPanel.parentElement !== exportHost) {
    exportHost.appendChild(exportPanel);
  }

  if (timelineHost && timeline && timeline.parentElement !== timelineHost) {
    timelineHost.appendChild(timeline);
  }
  if (editorHost && editor && editor.parentElement !== editorHost) {
    editorHost.appendChild(editor);
  }

  if (timeline) {
    timeline.className = 'hidden bg-black/90 border-2 border-[#ffcc00] rounded px-4 py-3 flex flex-wrap items-center gap-3 text-[10px] font-mono w-full';
  }
  if (editor) {
    editor.className = 'bg-black/90 border-2 border-[#00d0ff] rounded p-4 flex flex-col gap-4 w-full';
  }
  if (referenceVideo) {
    referenceVideo.className = 'space-y-3';
  }
  if (poseLibrary) {
    poseLibrary.className = 'space-y-3';
  }
  if (importPanel) {
    importPanel.className = 'space-y-3';
  }
  if (exportPanel) {
    exportPanel.className = 'space-y-2';
  }
  if (previewSplit) {
    previewSplit.className = ANIM_MODE_SPLIT_HIDDEN_CLASS;
  }
  if (modelStage) {
    modelStage.className = ANIM_MODE_MODEL_STAGE_CLASS;
  }
  if (rigStage) {
    rigStage.className = ANIM_MODE_RIG_STAGE_HIDDEN_CLASS;
  }
  if (rigPanel) {
    rigPanel.className = 'hidden h-full w-full bg-black/90 border-2 border-[#00ff88] rounded overflow-hidden flex flex-col min-h-0';
  }
  const rigSectionBody = document.getElementById('anim-mode-section-body-rig');
  if (rigSectionBody) {
    rigSectionBody.className = 'flex-1 min-h-0 p-3 flex flex-col gap-3';
  }
  const rigViewport = document.getElementById('anim-mode-rig-viewport');
  if (rigViewport) {
    rigViewport.className = 'relative flex-1 min-h-[16rem] bg-zinc-950 border border-[#00ff88]/40 overflow-hidden rounded';
  }

  syncAnimModeSectionStates();
  syncAnimModeSplitClasses();
  scheduleAnimModeLayoutResize();
}

function restoreDefaultAnimationModeLayout() {
  const workspace = document.getElementById('main-workspace');
  const viewport = document.getElementById('viewport');
  const previewSplit = document.getElementById('anim-mode-preview-split');
  const toggleRight = document.getElementById('toggle-right');
  const rightPanel = document.getElementById('right-panel');
  const rigPanel = document.getElementById('anim-mode-rig-panel');
  const toolsHost = document.getElementById('anim-mode-tools-panel');
  const rigStage = document.getElementById('anim-mode-rig-stage');

  if (workspace && viewport && toggleRight && viewport.parentElement !== workspace) {
    workspace.insertBefore(viewport, toggleRight);
  }
  if (viewport) {
    viewport.className = DEFAULT_VIEWPORT_CLASS;
  }
  if (rightPanel && rigPanel && rigPanel.parentElement !== rightPanel) {
    rightPanel.insertBefore(rigPanel, toolsHost || rightPanel.firstChild || null);
  }
  if (previewSplit) {
    previewSplit.classList.add('hidden');
  }
  if (rigStage) {
    rigStage.classList.add('hidden');
  }
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

function getReferenceVideoDom() {
  return {
    player: document.getElementById('anim-mode-reference-player'),
    input: document.getElementById('anim-mode-reference-input'),
    empty: document.getElementById('anim-mode-reference-empty'),
    time: document.getElementById('anim-mode-reference-time'),
    status: document.getElementById('anim-mode-reference-status'),
    fps: document.getElementById('anim-mode-reference-fps'),
    speedButtons: Array.from(document.querySelectorAll('[data-reference-video-speed]')),
  };
}

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

function setReferenceVideoStatus(message, mode = 'idle') {
  const { status } = getReferenceVideoDom();
  if (!status) return;
  status.textContent = message;
  status.className = mode === 'error'
    ? 'text-rose-300 text-[9px] leading-relaxed min-h-[1em]'
    : mode === 'success'
      ? 'text-[#ff77aa] text-[9px] leading-relaxed min-h-[1em]'
      : 'text-zinc-500 text-[9px] leading-relaxed min-h-[1em]';
}

function buildPoseLibraryAsset(poses = poseLibraryState.poses) {
  return {
    format: FAST_POSER_POSE_LIBRARY_FORMAT,
    version: 1,
    type: 'pose-library',
    poses,
  };
}

function generatePoseLibraryId() {
  return globalThis.crypto?.randomUUID?.()
    || `pose_${Date.now()}_${Math.round(Math.random() * 1e6).toString(36)}`;
}

function normalizePoseLibraryEntry(entry, fallbackIndex = 0) {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry) || typeof entry.pose !== 'object' || Array.isArray(entry.pose)) {
    return null;
  }

  return {
    id: String(entry.id || `pose_${fallbackIndex + 1}`).trim() || `pose_${fallbackIndex + 1}`,
    name: String(entry.name || `Pose ${fallbackIndex + 1}`).trim() || `Pose ${fallbackIndex + 1}`,
    characterIndex: Number.isInteger(entry.characterIndex) && entry.characterIndex >= 0 ? entry.characterIndex : 0,
    pose: entry.pose,
    createdAt: entry.createdAt || new Date().toISOString(),
    updatedAt: entry.updatedAt || new Date().toISOString(),
  };
}

function ensurePoseLibraryLoaded() {
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

function revokeReferenceVideoUrl() {
  if (!referenceVideoState.objectUrl) return;
  URL.revokeObjectURL(referenceVideoState.objectUrl);
  referenceVideoState.objectUrl = null;
}

function getReferenceVideoFrameStepSeconds() {
  const { fps } = getReferenceVideoDom();
  const fpsValue = Number.parseFloat(fps?.value || '30');
  const safeFps = THREE.MathUtils.clamp(Number.isFinite(fpsValue) ? fpsValue : 30, 1, 120);
  return 1 / safeFps;
}

function updateReferenceVideoUi() {
  const { player, empty, time, speedButtons } = getReferenceVideoDom();
  if (!player) return;

  if (empty) {
    const hasSource = !!player.currentSrc;
    empty.classList.toggle('hidden', hasSource);
  }

  if (time) {
    const current = Number.isFinite(player.currentTime) ? player.currentTime : 0;
    const duration = Number.isFinite(player.duration) ? player.duration : 0;
    time.textContent = `${current.toFixed(2)} / ${duration.toFixed(2)}`;
  }

  speedButtons.forEach((button) => {
    const buttonSpeed = Number.parseFloat(button.dataset.referenceVideoSpeed || '1');
    const isActive = Math.abs(buttonSpeed - referenceVideoState.speed) < 1e-6;
    button.className = isActive
      ? 'retro-button bg-[#ff77aa] border border-[#ff77aa] text-black px-2 py-1 text-[10px]'
      : 'retro-button bg-zinc-800 border border-[#ff77aa] text-[#ff77aa] px-2 py-1 text-[10px]';
  });
}

function ensureReferenceVideoBindings() {
  if (referenceVideoState.bindingsReady) return;
  const { player } = getReferenceVideoDom();
  if (!player) return;

  player.addEventListener('loadedmetadata', () => {
    player.playbackRate = referenceVideoState.speed;
    updateReferenceVideoUi();
    setReferenceVideoStatus('Reference video ready. You can slow it down or step through frames.', 'success');
  });
  player.addEventListener('timeupdate', () => {
    updateReferenceVideoUi();
  });
  player.addEventListener('pause', () => {
    updateReferenceVideoUi();
  });
  player.addEventListener('play', () => {
    updateReferenceVideoUi();
  });
  player.addEventListener('ended', () => {
    updateReferenceVideoUi();
    setReferenceVideoStatus('Reference video ended.', 'idle');
  });
  referenceVideoState.bindingsReady = true;
}

function refreshPoseLibraryUi() {
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

function upsertVectorTrackKeyframe(animationDef, targetName, property, time, value, restValue = [0, 0, 0]) {
  if (!animationDef || !targetName || !property || !Array.isArray(value)) return null;
  if (!Array.isArray(animationDef.tracks)) {
    animationDef.tracks = [];
  }

  let track = animationDef.tracks.find((entry) => entry.target === targetName && entry.property === property);
  if (!track) {
    const keyframes = [];
    const duration = Math.max(Number.isFinite(animationDef.duration) ? animationDef.duration : 0, time);
    const pushKeyframe = (keyTime, keyValue) => {
      if (!Number.isFinite(keyTime)) return;
      const existing = keyframes.find((entry) => Math.abs(entry.time - keyTime) < 1e-6);
      if (existing) {
        existing.value = [...keyValue];
        return;
      }
      keyframes.push({ time: keyTime, value: [...keyValue] });
    };

    pushKeyframe(0, restValue);
    pushKeyframe(time, value);
    if (duration > 0) {
      pushKeyframe(duration, restValue);
    }

    track = {
      target: targetName,
      property,
      interpolation: 'linear',
      keyframes: keyframes.sort((a, b) => a.time - b.time),
    };
    animationDef.tracks.push(track);
    return track;
  }

  if (!Array.isArray(track.keyframes)) {
    track.keyframes = [];
  }

  const existingKeyframe = track.keyframes.find((entry) => Math.abs(entry.time - time) < 1e-6);
  if (existingKeyframe) {
    existingKeyframe.value = [...value];
  } else {
    track.keyframes.push({ time, value: [...value] });
    track.keyframes.sort((a, b) => a.time - b.time);
  }

  return track;
}

function collectAnimationFrameTimes(animationDef) {
  const times = new Set();
  (animationDef?.tracks || []).forEach((track) => {
    (track?.keyframes || []).forEach((keyframe) => {
      if (Number.isFinite(keyframe?.time)) {
        times.add(Number(keyframe.time));
      }
    });
  });

  if (!times.size) {
    times.add(0);
  }

  if (Number.isFinite(animationDef?.duration) && animationDef.duration > 0) {
    times.add(Number(animationDef.duration));
  }

  return Array.from(times).sort((a, b) => a - b);
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

function sampleTrackValue(track, time) {
  const keyframes = track?.keyframes || [];
  if (!keyframes.length) return null;
  if (time <= keyframes[0].time) {
    return Array.isArray(keyframes[0].value) ? [...keyframes[0].value] : keyframes[0].value;
  }

  for (let index = 1; index < keyframes.length; index += 1) {
    const previous = keyframes[index - 1];
    const next = keyframes[index];
    if (time > next.time) continue;

    if (Math.abs(time - next.time) < 1e-6) {
      return Array.isArray(next.value) ? [...next.value] : next.value;
    }

    if (track.interpolation === 'step') {
      return Array.isArray(previous.value) ? [...previous.value] : previous.value;
    }

    if (!Array.isArray(previous.value) || !Array.isArray(next.value) || previous.value.length !== next.value.length) {
      return Array.isArray(previous.value) ? [...previous.value] : previous.value;
    }

    const span = Math.max(next.time - previous.time, 1e-6);
    const alpha = THREE.MathUtils.clamp((time - previous.time) / span, 0, 1);
    return previous.value.map((value, valueIndex) => THREE.MathUtils.lerp(value ?? 0, next.value[valueIndex] ?? 0, alpha));
  }

  const last = keyframes[keyframes.length - 1];
  return Array.isArray(last.value) ? [...last.value] : last.value;
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

function computeSkeletonWorldPositions(skeleton) {
  const boneLookup = new Map((skeleton?.bones || []).map((bone) => [bone.name, bone]));
  const result = new Map();

  function resolveBonePosition(name) {
    if (result.has(name)) {
      return result.get(name).clone();
    }

    const bone = boneLookup.get(name);
    if (!bone) return null;

    const position = new THREE.Vector3(...(bone.position || [0, 0, 0]));
    if (bone.parent) {
      const parentPosition = resolveBonePosition(bone.parent);
      if (parentPosition) {
        position.add(parentPosition);
      }
    }

    result.set(name, position.clone());
    return position;
  }

  (skeleton?.bones || []).forEach((bone) => resolveBonePosition(bone.name));
  return result;
}

function buildRigPreviewHelper(skeleton, restWorldPositions) {
  const helperGroup = new THREE.Group();
  const boneEntries = [];
  const lineEntries = [];
  const entryLookup = new Map();

  (skeleton?.bones || []).forEach((bone) => {
    const node = new THREE.Group();
    node.name = bone.name;
    node.userData.name = bone.name;

    const sphere = new THREE.Mesh(RIG_PREVIEW_BONE_GEO, RIG_PREVIEW_BONE_MAT.clone());
    sphere.renderOrder = 999;
    node.add(sphere);

    const restPosition = restWorldPositions.get(bone.name)?.clone() || new THREE.Vector3();
    node.position.copy(restPosition);
    helperGroup.add(node);

    const entry = { bone, node, sphere, restPosition };
    boneEntries.push(entry);
    entryLookup.set(bone.name, entry);
  });

  (skeleton?.bones || []).forEach((bone) => {
    if (!bone.parent) return;

    const childEntry = entryLookup.get(bone.name);
    const parentEntry = entryLookup.get(bone.parent);
    if (!childEntry || !parentEntry) return;

    const geometry = new THREE.BufferGeometry().setFromPoints([
      parentEntry.node.position.clone(),
      childEntry.node.position.clone(),
    ]);
    const line = new THREE.Line(geometry, RIG_PREVIEW_LINE_MAT.clone());
    line.renderOrder = 998;
    helperGroup.add(line);
    lineEntries.push({ parentEntry, childEntry, line });
  });

  return { helperGroup, boneEntries, lineEntries };
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
  getReferenceVideoDom().player?.pause?.();
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
  document.getElementById('right-panel')?.setAttribute('class', DEFAULT_RIGHT_PANEL_CLASS);
  document.getElementById('right-panel')?.style.removeProperty('width');
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
  ensureReferenceVideoBindings();
  const { player, input } = getReferenceVideoDom();
  const file = event?.target?.files?.[0] || input?.files?.[0] || null;
  if (!player || !file) {
    setReferenceVideoStatus('Choose a local video file first.', 'error');
    return;
  }

  revokeReferenceVideoUrl();
  referenceVideoState.objectUrl = URL.createObjectURL(file);
  player.pause();
  player.src = referenceVideoState.objectUrl;
  player.currentTime = 0;
  player.load();
  updateReferenceVideoUi();
  setReferenceVideoStatus(`Loading "${file.name}"...`);
}

export function animModeClearReferenceVideo() {
  const { player, input } = getReferenceVideoDom();
  if (!player) return;
  player.pause();
  player.removeAttribute('src');
  player.load();
  if (input) {
    input.value = '';
  }
  revokeReferenceVideoUrl();
  updateReferenceVideoUi();
  setReferenceVideoStatus('Reference video cleared.');
}

export async function animModeToggleReferenceVideoPlayback() {
  ensureReferenceVideoBindings();
  const { player } = getReferenceVideoDom();
  if (!player?.currentSrc) {
    setReferenceVideoStatus('Load a local reference video first.', 'error');
    return;
  }

  if (!player.paused) {
    player.pause();
    setReferenceVideoStatus('Reference video paused.');
    return;
  }

  try {
    player.playbackRate = referenceVideoState.speed;
    await player.play();
    setReferenceVideoStatus(`Playing at ${referenceVideoState.speed}x.`, 'success');
  } catch (error) {
    console.error(error);
    setReferenceVideoStatus('Could not start video playback.', 'error');
  }
}

function stepReferenceVideo(direction) {
  ensureReferenceVideoBindings();
  const { player } = getReferenceVideoDom();
  if (!player?.currentSrc) {
    setReferenceVideoStatus('Load a local reference video first.', 'error');
    return;
  }

  player.pause();
  const step = getReferenceVideoFrameStepSeconds();
  const duration = Number.isFinite(player.duration) ? player.duration : 0;
  const nextTime = THREE.MathUtils.clamp(
    (Number.isFinite(player.currentTime) ? player.currentTime : 0) + (step * direction),
    0,
    Math.max(duration || 0, 0)
  );
  player.currentTime = nextTime;
  updateReferenceVideoUi();
  setReferenceVideoStatus(`Stepped to ${nextTime.toFixed(2)}s using ${step.toFixed(3)}s/frame.`);
}

export function animModeReferenceVideoPrevFrame() {
  stepReferenceVideo(-1);
}

export function animModeReferenceVideoNextFrame() {
  stepReferenceVideo(1);
}

export function animModeSetReferenceVideoSpeed(speed) {
  const nextSpeed = THREE.MathUtils.clamp(Number.parseFloat(speed) || 1, 0.1, 4);
  referenceVideoState.speed = nextSpeed;
  const { player } = getReferenceVideoDom();
  if (player) {
    player.playbackRate = nextSpeed;
  }
  updateReferenceVideoUi();
  setReferenceVideoStatus(`Reference speed set to ${nextSpeed}x.`, 'success');
}

export function animModeSelectPose() {
  ensurePoseLibraryLoaded();
  const { nameInput, select } = getPoseLibraryDom();
  poseLibraryState.selectedPoseId = String(select?.value || '');
  const selected = getSelectedPoseLibraryEntry();
  if (nameInput && selected) {
    nameInput.value = selected.name;
  }
  setPoseLibraryStatus(selected ? `Selected pose "${selected.name}".` : 'No pose selected.');
}

export function animModeSavePoseToLibrary() {
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

export function animModePreviewPose() {
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

export function animModeApplyPoseToFrame() {
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
  setPoseLibraryStatus(`Applied pose "${poseEntry.name}" to frame ${animEditorState.keyframeIndex + 1}.`, 'success');
}

export function animModeDeletePose() {
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

export function animModeExportPoseLibrary() {
  ensurePoseLibraryLoaded();
  if (poseLibraryState.poses.length === 0) {
    setPoseLibraryStatus('Save or import at least one pose before exporting.', 'error');
    return;
  }

  downloadJsonFile(buildPoseLibraryAsset(), 'fast-poser.pose-library.json');
  setPoseLibraryStatus('Fast Poser pose library exported.', 'success');
}

export async function animModeImportPoseLibrary(event) {
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
